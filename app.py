"""
Lateral Movement Detector — Flask REST API
==========================================
Reads telemetry.json, builds a NetworkX device graph, and uses a
sliding-window correlation engine to find candidate attack paths.

Scoring formula (fully transparent, no black box):
  score = w_privilege  * privilege_score   (0-1)
        + w_crossfloor * cross_floor_score (0-1)
        + w_compress   * time_compress_score (0-1)
        + w_severity   * severity_score    (0-1)
        + w_segcross   * segment_cross_score (0-1)

Weights are exposed in every response so callers can audit them.
"""

import json
import math
from datetime import datetime, timedelta
from collections import defaultdict

import networkx as nx
from flask import Flask, jsonify, request
import subprocess
import threading
import time
import random
import os
import requests
from dotenv import load_dotenv

load_dotenv()

ULTRAMSG_INSTANCE_ID = os.getenv("ULTRAMSG_INSTANCE_ID")
ULTRAMSG_TOKEN = os.getenv("ULTRAMSG_TOKEN")
ALERT_WHATSAPP_NUMBER = os.getenv("ALERT_WHATSAPP_NUMBER")

print(f"DEBUG: Loaded ULTRAMSG_INSTANCE_ID={ULTRAMSG_INSTANCE_ID}")
print(f"DEBUG: Loaded ALERT_WHATSAPP_NUMBER={ALERT_WHATSAPP_NUMBER}")

LAST_NOTIFIED_ATTACK_PATH = None

def send_whatsapp_alert(score, path_chain, entry_floor, target_floor):
    if not all([ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN, ALERT_WHATSAPP_NUMBER]) or ALERT_WHATSAPP_NUMBER == "<my WhatsApp number with country code, no + or spaces>":
        print("UltraMsg credentials not fully configured. Skipping WhatsApp alert.")
        return

    url = f"https://api.ultramsg.com/{ULTRAMSG_INSTANCE_ID}/messages/chat"
    
    body = (
        f"🚨 CRITICAL THREAT DETECTED - Score: {score}/10. "
        f"Attack path: {path_chain[0]} (Floor {entry_floor}) -> {path_chain[-1]} (Floor {target_floor}). "
        f"Check Aegis Mission Control dashboard immediately."
    )
    
    payload = {
        "token": ULTRAMSG_TOKEN,
        "to": ALERT_WHATSAPP_NUMBER if ALERT_WHATSAPP_NUMBER.startswith("+") else f"+{ALERT_WHATSAPP_NUMBER}",
        "body": body
    }
    
    print(f"DEBUG: Sending WhatsApp alert to {url}")
    # Safely print body to avoid UnicodeEncodeError on Windows consoles with the emoji
    safe_body = body.encode('ascii', 'replace').decode('ascii')
    print(f"DEBUG: Payload to={ALERT_WHATSAPP_NUMBER}, body='{safe_body}'")
    
    response = requests.post(url, data=payload, timeout=5)
    
    print(f"DEBUG: UltraMsg API response status={response.status_code}")
    print(f"DEBUG: UltraMsg API response body={response.text}")
    
    response.raise_for_status()

# ── Configuration ────────────────────────────────────────────────────────────
TELEMETRY_PATH = "telemetry.json"

# Default sliding window (minutes).  Can be overridden via ?window_minutes=N
DEFAULT_WINDOW_MINUTES = 10

# Minimum chain length (number of devices) to report
MIN_CHAIN_LEN = 2

# Maximum DFS depth (hops) per chain
MAX_CHAIN_DEPTH = 5

# Maximum active devices per window before we skip (noisy/benign window)
MAX_ACTIVE_DEVICES_PER_WINDOW = 30

# Maximum number of top results to return
TOP_N = 10

# Scoring weights (must sum to 1.0 — enforced at startup)
WEIGHTS = {
    "privilege":     0.30,   # events that escalate access rights
    "cross_floor":   0.25,   # movement across building floors
    "time_compress": 0.20,   # tight time delta -> rapid lateral hop
    "severity":      0.15,   # high-severity event types present
    "segment_cross": 0.10,   # movement across network segments (VLANs)
}

# Event-type severity scores (0 = benign, 1 = critical)
SEVERITY_MAP = {
    "privilege_escalation":          1.0,
    "lateral_movement":              0.90,
    "suspicious_auth_attempt":       0.80,
    "anomalous_outbound_connection": 0.65,
    "login":                         0.20,
    "badge_swipe":                   0.10,
    "network_heartbeat":             0.05,
    "sensor_ping":                   0.02,
}

# Events that carry privilege-escalation signal
PRIVILEGE_EVENTS = {
    "privilege_escalation",
    "suspicious_auth_attempt",
    "anomalous_outbound_connection",
}

assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"

app = Flask(__name__)

DEVICES = []
EVENTS = []
GROUND_TRUTH = {}
DEVICE_BY_ID = {}
GRAPH = None

# ── Graph construction ────────────────────────────────────────────────────────

def build_device_graph():
    """
    Build a directed graph where:
      - Nodes  = devices (with attributes: type, floor, network_segment)
      - Edges  = network or physical relationships
        * Static topology edges from devices[].connected_devices
        * Dynamic event edges from events where target_device_id is set
    Each edge carries: relationship_type, weight
    """
    G = nx.DiGraph()

    # Add nodes
    for dev in DEVICES:
        G.add_node(
            dev["id"],
            device_type=dev["type"],
            floor=dev["floor"],
            network_segment=dev["network_segment"],
        )

    # Static topology edges (from device connectivity declarations)
    for dev in DEVICES:
        src = dev["id"]
        for tgt in dev.get("connected_devices", []):
            if tgt in DEVICE_BY_ID:
                G.add_edge(src, tgt, relationship_type="topology", weight=1.0)

    # Dynamic event-driven edges (where target_device_id is present)
    event_edge_counts = defaultdict(int)
    for ev in EVENTS:
        src = ev["device_id"]
        tgt = ev.get("target_device_id")
        if tgt and tgt in DEVICE_BY_ID:
            event_edge_counts[(src, tgt)] += 1

    for (src, tgt), count in event_edge_counts.items():
        weight = min(1.0, math.log1p(count) / math.log1p(50))
        if G.has_edge(src, tgt):
            existing = G[src][tgt]["weight"]
            G[src][tgt]["weight"] = max(existing, weight)
            G[src][tgt]["relationship_type"] = "topology+event"
        else:
            G.add_edge(src, tgt, relationship_type="event", weight=weight)

    return G


def load_telemetry_data():
    global DEVICES, EVENTS, GROUND_TRUTH, DEVICE_BY_ID, GRAPH
    with open(TELEMETRY_PATH, encoding="utf-8") as fh:
        _raw = json.load(fh)

    DEVICES = _raw["devices"]
    EVENTS = _raw["events"]
    GROUND_TRUTH = _raw["ground_truth"]

    # Pre-parse timestamps once
    for ev in EVENTS:
        ts_str = ev["timestamp"]
        try:
            ev["_ts"] = datetime.fromisoformat(ts_str)
        except ValueError:
            ev["_ts"] = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S")

    # Sort events chronologically
    EVENTS.sort(key=lambda e: e["_ts"])

    # Device lookup maps
    DEVICE_BY_ID = {d["id"]: d for d in DEVICES}
    
    GRAPH = build_device_graph()

load_telemetry_data()


# ── Sliding-window correlation engine ────────────────────────────────────────

def _events_in_window(anchor_ts, window):
    """Return all events within [anchor_ts, anchor_ts + window]."""
    end_ts = anchor_ts + window
    lo, hi = 0, len(EVENTS)
    while lo < hi:
        mid = (lo + hi) // 2
        if EVENTS[mid]["_ts"] < anchor_ts:
            lo = mid + 1
        else:
            hi = mid
    start_idx = lo
    result = []
    for ev in EVENTS[start_idx:]:
        if ev["_ts"] > end_ts:
            break
        result.append(ev)
    return result


def _group_by_device(events):
    by_dev = defaultdict(list)
    for ev in events:
        by_dev[ev["device_id"]].append(ev)
    return dict(by_dev)


# ── Per-chain scoring (transparent weighted formula) ──────────────────────────

def _privilege_score(chain_events):
    """
    Fraction of events in the chain that are privilege-signal events.
    Bonus: full score if 'privilege_escalation' itself is present.
    """
    if not chain_events:
        return 0.0
    priv_count = sum(1 for e in chain_events if e["event_type"] in PRIVILEGE_EVENTS)
    if any(e["event_type"] == "privilege_escalation" for e in chain_events):
        return 1.0
    return min(1.0, priv_count / max(1, len(chain_events)))


def _cross_floor_score(chain_devices):
    """
    Score = unique floors visited / (total chain length - 1).
    """
    if len(chain_devices) < 2:
        return 0.0
    floors = [DEVICE_BY_ID[d]["floor"] for d in chain_devices if d in DEVICE_BY_ID]
    if not floors:
        return 0.0
    unique_floors = len(set(floors))
    return min(1.0, (unique_floors - 1) / max(1, len(chain_devices) - 1))


def _time_compress_score(chain_events, window):
    """
    Time compression: rapid chains score higher.
    score = 1 - (actual_span / window_duration)
    """
    if len(chain_events) < 2:
        return 0.0
    timestamps = [e["_ts"] for e in chain_events]
    span = max(timestamps) - min(timestamps)
    ratio = span.total_seconds() / max(1, window.total_seconds())
    return max(0.0, 1.0 - ratio)


def _severity_score(chain_events):
    """
    Blended severity: 60% mean + 40% max.
    """
    if not chain_events:
        return 0.0
    scores = [SEVERITY_MAP.get(e["event_type"], 0.05) for e in chain_events]
    return 0.6 * (sum(scores) / len(scores)) + 0.4 * max(scores)


def _segment_cross_score(chain_devices):
    """
    Unique VLANs visited relative to chain length.
    """
    if len(chain_devices) < 2:
        return 0.0
    segs = [
        DEVICE_BY_ID[d]["network_segment"]
        for d in chain_devices
        if d in DEVICE_BY_ID
    ]
    if not segs:
        return 0.0
    unique_segs = len(set(segs))
    return min(1.0, (unique_segs - 1) / max(1, len(chain_devices) - 1))


def _score_chain(chain_devices, chain_events, window):
    """
    Return a transparent score breakdown dict for a candidate chain.
    """
    ps = _privilege_score(chain_events)
    cf = _cross_floor_score(chain_devices)
    tc = _time_compress_score(chain_events, window)
    ss = _severity_score(chain_events)
    sc = _segment_cross_score(chain_devices)

    total_score = (
        WEIGHTS["privilege"] * ps +
        WEIGHTS["cross_floor"] * cf +
        WEIGHTS["time_compress"] * tc +
        WEIGHTS["severity"] * ss +
        WEIGHTS["segment_cross"] * sc
    )

    return {
        "total_score": total_score,
        "components": {
            "privilege": ps,
            "cross_floor": cf,
            "time_compress": tc,
            "severity": ss,
            "segment_cross": sc
        }
    }


# ── Chain discovery (sliding window) ─────────────────────────────────────────

# Anchor event types: only truly suspicious events start a search window
_CRITICAL_TYPES = {
    "privilege_escalation",
    "lateral_movement",
    "suspicious_auth_attempt",
    "anomalous_outbound_connection",
}

# Broad high-sev types used when expanding the causal graph inside a window
_HIGH_SEV_TYPES = {
    "privilege_escalation",
    "lateral_movement",
    "suspicious_auth_attempt",
    "anomalous_outbound_connection",
    "login",
    "badge_swipe",
}


def find_lateral_movement_chains(window_minutes=DEFAULT_WINDOW_MINUTES,
                                  min_chain_len=MIN_CHAIN_LEN,
                                  top_n=TOP_N):
    """
    Sliding-window lateral movement detection.

    Algorithm:
    1. Anchor only on critical-signal events (privilege_escalation,
       lateral_movement, suspicious_auth_attempt,
       anomalous_outbound_connection) — keeps anchor count tiny.
    2. For each anchor, collect all events within [anchor, anchor + window].
    3. Build a lightweight *causal graph* for that window: directed edge
       A -> B if:
         a. Event has explicit target_device_id (network edge), OR
         b. Device A emits a high-sev event AND device B is in the same
            VLAN or on an adjacent floor within the same window.
    4. Enumerate all simple paths up to MAX_CHAIN_DEPTH in the causal
       graph starting from the anchor device (networkx all_simple_paths —
       polynomial on sparse causal graphs).
    5. Score each path and keep the best result per unique device-path key.
    6. Return top-N by total_score.
    """
    window = timedelta(minutes=window_minutes)
    seen_paths = {}

    anchor_events = [e for e in EVENTS if e["event_type"] in _CRITICAL_TYPES]

    for anchor_ev in anchor_events:
        window_events = _events_in_window(anchor_ev["_ts"], window)
        if len(window_events) < min_chain_len:
            continue

        by_dev = _group_by_device(window_events)
        active_devices = list(by_dev.keys())
        if len(active_devices) < min_chain_len:
            continue

        # ── Build causal graph for this window ──────────────────────────
        cg = nx.DiGraph()
        cg.add_nodes_from(active_devices)

        # (a) Explicit target edges from events (network/physical communication)
        for ev in window_events:
            src = ev["device_id"]
            tgt = ev.get("target_device_id")
            if tgt and tgt in by_dev:
                cg.add_edge(src, tgt)

        # (b) High-sev device -> same-VLAN or adjacent-floor peers
        high_sev_devs = {
            ev["device_id"]
            for ev in window_events
            if ev["event_type"] in _HIGH_SEV_TYPES
        }
        for src in high_sev_devs:
            if src not in DEVICE_BY_ID:
                continue
            src_seg   = DEVICE_BY_ID[src]["network_segment"]
            src_floor = DEVICE_BY_ID[src]["floor"]
            for tgt in active_devices:
                if tgt == src or cg.has_edge(src, tgt):
                    continue
                tgt_seg = DEVICE_BY_ID[tgt].get("network_segment")
                tgt_floor = DEVICE_BY_ID[tgt].get("floor")
                
                # Check same VLAN or adjacent floor
                if tgt_seg == src_seg or (tgt_floor is not None and src_floor is not None and abs(tgt_floor - src_floor) <= 1):
                    cg.add_edge(src, tgt)
                    
        # ── Find chains starting from anchor ─────────────────────────────
        anchor_id = anchor_ev["device_id"]
        if anchor_id not in cg:
            continue
            
        for tgt in cg.nodes():
            if tgt == anchor_id:
                continue
                
            for path in nx.all_simple_paths(cg, anchor_id, tgt, cutoff=MAX_CHAIN_DEPTH):
                if len(path) < min_chain_len:
                    continue
                    
                path_set = set(path)
                path_events = [e for e in window_events if e["device_id"] in path_set]
                
                score_info = _score_chain(path, path_events, window)
                path_key = tuple(path)
                
                if path_key not in seen_paths or score_info["total_score"] > seen_paths[path_key]["score"]["total_score"]:
                    # Create json-serializable events dict (removing datetime object)
                    serializable_events = []
                    users_involved = set()
                    for e in path_events:
                        ev_dict = {k: v for k, v in e.items() if k != "_ts"}
                        ev_dict["timestamp"] = e["_ts"].isoformat()
                        if "user" in ev_dict:
                            users_involved.add(ev_dict["user"])
                        serializable_events.append(ev_dict)
                        
                    seen_paths[path_key] = {
                        "chain": path,
                        "events": serializable_events,
                        "users": list(users_involved),
                        "score": score_info,
                    }

    ranked = sorted(
        seen_paths.values(),
        key=lambda x: x["score"]["total_score"],
        reverse=True,
    )
    
    top_ranked = ranked[:top_n]
    return top_ranked


# ── Flask REST endpoints ──────────────────────────────────────────────────────

@app.route("/api/trigger-attack", methods=["POST"])
def trigger_attack():
    global LAST_NOTIFIED_ATTACK_PATH
    """
    POST /api/trigger-attack
    Runs generate_telemetry.py and reloads data.
    """
    import sys
    script_path = r"generate_telemetry.py"
    try:
        subprocess.run([sys.executable, script_path], check=True, capture_output=True, text=True)
        load_telemetry_data()
        
        # Determine the top attack path and send notification
        chains = find_lateral_movement_chains(window_minutes=DEFAULT_WINDOW_MINUTES, min_chain_len=MIN_CHAIN_LEN, top_n=1)
        if chains:
            top_path_data = chains[0]
            score_10 = top_path_data["score"]["total_score"] * 10
            if score_10 >= 7.0:
                top_path_key = tuple(top_path_data["chain"])
                if top_path_key == LAST_NOTIFIED_ATTACK_PATH:
                    print("Skipping WhatsApp alert - same attack already notified.")
                else:
                    entry_device = top_path_data["chain"][0]
                    target_device = top_path_data["chain"][-1]
                    entry_floor = DEVICE_BY_ID.get(entry_device, {}).get("floor", "?")
                    target_floor = DEVICE_BY_ID.get(target_device, {}).get("floor", "?")
                    
                    send_whatsapp_alert(f"{score_10:.1f}", top_path_data["chain"], entry_floor, target_floor)
                    LAST_NOTIFIED_ATTACK_PATH = top_path_key

        return jsonify({"status": "success", "message": "Telemetry regenerated and reloaded."})
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Failed to generate telemetry", "details": e.stderr}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/graph", methods=["GET"])
def graph_info():
    """
    GET /api/graph
    Returns the full device graph (nodes + edges) as JSON.
    """
    nodes = [{"id": n, **GRAPH.nodes[n]} for n in GRAPH.nodes]
    edges = [{"source": u, "target": v, **GRAPH.edges[u, v]} for u, v in GRAPH.edges]
    return jsonify({
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
    })


@app.route("/api/attack-paths", methods=["GET"])
def attack_paths():
    """
    GET /api/attack-paths?window_minutes=10&top_n=10&min_chain_len=2

    Query parameters:
      window_minutes  int  (default 10)  - sliding window size in minutes
      top_n           int  (default 10)  - max results to return
      min_chain_len   int  (default 2)   - minimum chain length
    """
    load_telemetry_data() # Force fresh read on each request
    
    try:
        window_minutes = int(request.args.get("window_minutes", DEFAULT_WINDOW_MINUTES))
        top_n          = int(request.args.get("top_n", TOP_N))
        min_chain_len  = int(request.args.get("min_chain_len", MIN_CHAIN_LEN))
    except ValueError as exc:
        return jsonify({"error": f"Invalid query parameter: {exc}"}), 400

    if window_minutes < 1 or window_minutes > 1440:
        return jsonify({"error": "window_minutes must be between 1 and 1440"}), 400

    chains = find_lateral_movement_chains(
        window_minutes=window_minutes,
        min_chain_len=min_chain_len,
        top_n=top_n,
    )

    return jsonify({
        "parameters": {
            "window_minutes": window_minutes,
            "top_n": top_n,
            "min_chain_len": min_chain_len,
        },
        "scoring_weights": WEIGHTS,
        "scoring_formula": (
            "total_score = Σ(weight_i * component_score_i), "
            "where all component_scores in [0, 1]"
        ),
        "total_candidates": len(chains),
        "attack_paths": chains,
    })


@app.route("/api/ground-truth", methods=["GET"])
def ground_truth_endpoint():
    """
    GET /api/ground-truth
    Returns the known ground-truth attack details for comparison.
    """
    return jsonify(GROUND_TRUTH)


@app.route("/api/events", methods=["GET"])
def events_endpoint():
    """
    GET /api/events?device_id=dev-015&event_type=lateral_movement
    Returns filtered event list. All filters optional.
    """
    dev_filter  = request.args.get("device_id")
    type_filter = request.args.get("event_type")

    result = EVENTS
    if dev_filter:
        result = [e for e in result if e["device_id"] == dev_filter]
    if type_filter:
        result = [e for e in result if e["event_type"] == type_filter]

    serialised = []
    for ev in result:
        row = {k: v for k, v in ev.items() if k != "_ts"}
        row["timestamp"] = ev["_ts"].isoformat()
        serialised.append(row)

    return jsonify({"count": len(serialised), "events": serialised})


@app.route("/api/device/<device_id>", methods=["GET"])
def device_detail(device_id):
    """
    GET /api/device/<device_id>
    Returns device metadata, graph neighbourhood, and all its events.
    """
    if device_id not in DEVICE_BY_ID:
        return jsonify({"error": f"Device '{device_id}' not found"}), 404

    dev = DEVICE_BY_ID[device_id]
    predecessors = list(GRAPH.predecessors(device_id))
    successors   = list(GRAPH.successors(device_id))

    dev_events = []
    for e in EVENTS:
        if e["device_id"] == device_id:
            row = {k: v for k, v in e.items() if k != "_ts"}
            row["timestamp"] = e["_ts"].isoformat()
            dev_events.append(row)

    return jsonify({
        "device": dev,
        "graph": {
            "in_degree":    GRAPH.in_degree(device_id),
            "out_degree":   GRAPH.out_degree(device_id),
            "predecessors": predecessors,
            "successors":   successors,
        },
        "event_count": len(dev_events),
        "events": dev_events,
    })


@app.route("/api/health", methods=["GET"])
def health():
    """GET /api/health — liveness probe."""
    return jsonify({
        "status":       "ok",
        "device_count": len(DEVICES),
        "event_count":  len(EVENTS),
        "graph_nodes":  GRAPH.number_of_nodes(),
        "graph_edges":  GRAPH.number_of_edges(),
    })


@app.route("/", methods=["GET"])
def index():
    """API index with endpoint documentation."""
    return jsonify({
        "service": "Lateral Movement Detector",
        "version": "1.0.0",
        "endpoints": {
            "GET /":                       "This help text",
            "GET /api/health":             "Liveness probe",
            "GET /api/graph":              "Full device graph (nodes + edges)",
            "GET /api/attack-paths":       "Top lateral movement candidates",
            "GET /api/ground-truth":       "Known attack ground-truth",
            "GET /api/events":             "Filtered event list (?device_id, ?event_type)",
            "GET /api/device/<device_id>": "Device detail + neighbourhood + events",
            "POST /api/simulation/start":  "Start continuous background simulation",
            "POST /api/simulation/stop":   "Stop background simulation",
            "GET /api/simulation/status":  "Check background simulation status",
        },
        "attack_paths_params": {
            "window_minutes": f"int, default {DEFAULT_WINDOW_MINUTES}",
            "top_n":          f"int, default {TOP_N}",
            "min_chain_len":  f"int, default {MIN_CHAIN_LEN}",
        },
    })



# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)
