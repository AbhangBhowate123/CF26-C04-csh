# CF26-C04-csh — Spatial Cyber Threat Reconstruction Engine

**Aegis Mission Control** — a simulated multi-floor building security system that
correlates fragmented device telemetry into explainable, reconstructed attack paths.

---

## 1. Problem Statement & Solution Overview

### Problem (C-04, Cybersecurity & Digital Trust)

Modern buildings contain hundreds of interconnected devices distributed across
multiple floors, network segments, and access zones. Security events are often
observed independently, making it difficult to determine how an incident evolved
across physical locations and network relationships. A sequence of individually
harmless events may represent a coordinated attack when viewed together.

### Our Solution

**Aegis Mission Control** is a simulated multi-floor building security platform
that:

- Ingests device telemetry (logins, badge swipes, sensor pings, network
  heartbeats) from a simulated 5-floor building with ~58 devices.
- Builds a live graph of device relationships (network segments, physical
  floor adjacency).
- Runs a correlation engine over a sliding time window to detect candidate
  lateral-movement chains hidden inside normal background noise.
- Scores each candidate attack path using a transparent, explainable formula
  (not a black box), based on cross-floor movement, privilege escalation
  indicators, and time compression.
- Presents the reconstructed attack path, its threat score, and the specific
  reasons behind that score on a live "mission control" style dashboard.

The system never relies on real network scanning or intrusion — per the problem
statement, the entire environment is a software-only simulation.

---

## 2. System Architecture / Workflow

```
┌────────────────────┐      ┌─────────────────────┐      ┌───────────────────────┐
│  Telemetry          │      │  Flask Backend        │      │  Next.js Frontend       │
│  Generator           │ ──▶  │  (Graph + Correlation │ ──▶  │  (Aegis Mission Control │
│  (generate_          │      │   Engine)             │      │   Dashboard)            │
│   telemetry.py)      │      │                        │      │                         │
└────────────────────┘      └─────────────────────┘      └───────────────────────┘
        │                            │                              │
        ▼                            ▼                              ▼
  telemetry.json              /api/attack-paths              Live dashboard:
  (devices, events,           endpoint returns scored          - Threat Assessment
   ground_truth)              candidate attack chains           - Attack Path Graph
                                                                  - Analysis Vectors
                                                                  - Facility Schematic
                                                                  - System Terminal
```

**Flow:**
1. The generator builds a synthetic building (devices + network topology) and
   produces a realistic event stream: hundreds of normal background events
   plus one hidden multi-step attack chain, with intentional timestamp jitter,
   delay, and duplication to simulate imperfect real-world telemetry.
2. The backend loads this telemetry, constructs a device relationship graph
   using `networkx`, and runs a sliding time-window correlation pass to
   surface candidate lateral-movement chains.
3. Each candidate chain is scored using a transparent weighted formula and
   returned via a REST endpoint, along with the specific contributing
   reasons.
4. The frontend polls this endpoint and renders the reconstructed attack
   path, threat score, contributing factors, affected facility levels, and
   a live event log — giving an analyst a full explainable picture rather
   than a single opaque alert.

---

## 3. Core Technical Mechanism

- **Graph construction:** Devices are modeled as nodes; network/physical
  relationships (shared VLAN, floor routers, badge-reader proximity) are
  modeled as edges using `networkx`.
- **Correlation engine:** A sliding time-window scan looks for chains of
  events across connected devices (A → B → C within N minutes) that are
  consistent with lateral movement.
- **Explainable scoring:** Each candidate chain receives a score based on
  clearly named, human-readable factors — cross-floor movement, privilege
  escalation indicators, and time compression — rather than a single
  unexplained probability from a black-box model.
- **Resilience to imperfect telemetry:** The synthetic event stream includes
  duplicated, delayed, and slightly out-of-order events, and the correlation
  logic is designed to tolerate this rather than assume clean, ordered input.

---

## 4. Technology Stack

| Layer               | Technology                                 |
|----------------------|---------------------------------------------|
| Data simulation       | Python                                     |
| Backend / API          | Flask, NetworkX                            |
| Frontend               | Next.js, React, Tailwind CSS               |
| UI design                | Google Stitch (design generation), Google Antigravity (agentic IDE) |
| Dev tooling               | Git, GitHub                              |

---

## 5. Setup & Installation Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### Backend
```bash
cd backend
pip install -r requirements.txt
python generate_telemetry.py    # generates telemetry.json
python app.py                   # starts Flask server on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                     # starts Next.js dev server on http://localhost:3000
```

### Run both together (Windows)
A convenience script `start_project.bat` is included in the project root. It
regenerates fresh telemetry, then launches the backend and frontend in
separate terminal windows.

```
start_project.bat
```

---

## 6. Usage Instructions

1. Start the backend and frontend as described above.
2. Open `http://localhost:3000` in a browser to view the **Aegis Mission
   Control** dashboard.
3. The dashboard displays:
   - **Threat Assessment** — overall reconstructed threat score (0–10)
   - **Attack Path Reconstruction** — a graph of the devices involved in the
     detected lateral-movement chain
   - **Analysis Vectors** — plain-language, expandable reasons contributing
     to the score
   - **Facility Schematic** — floor-by-floor view with the affected level
     highlighted
   - **System Terminal** — a live, timestamped event log
4. To generate a new scenario, re-run `python generate_telemetry.py` and
   restart the backend (or use the in-dashboard simulate/trigger action, if
   enabled) to see a fresh, independently detected attack path.

---

## 7. Validation / Experiments / Results

- The synthetic dataset embeds a known **ground truth** attack chain
  (compromised entry device → lateral movement across a shared network
  segment → suspicious authentication → privilege escalation), stored
  alongside the generated telemetry.
- We validated the correlation engine by confirming that the top-scoring
  candidate chain returned by `/api/attack-paths` matches the embedded
  ground-truth chain across multiple regenerated scenarios.
- We manually verified that the engine tolerates the injected jitter,
  duplication, and out-of-order event, per the "telemetry may be incomplete,
  duplicated, delayed, or out of order" constraint in the problem statement.
- We compared the reconstructed path and its explanation against the
  ground-truth description to confirm the "reasons" shown on the dashboard
  (cross-floor movement, privilege escalation, time compression) accurately
  reflect why the chain was flagged.

*(Add specific numbers/screenshots here once final testing is complete —
e.g. detection rate across N regenerated scenarios, average latency of the
correlation pass, etc.)*

---

## 8. Limitations & Future Scope

**Current limitations:**
- The environment and telemetry are fully simulated; no integration with
  real building sensors, cameras, or network taps.
- The correlation engine currently surfaces a limited set of top candidate
  chains rather than a fully general anomaly-detection pipeline.
- Scoring weights are manually tuned rather than learned from labeled
  incident data.

**Future scope:**
- Support multiple simultaneous, independent attack scenarios rendered
  together on the dashboard.
- Incorporate a learned/ML-assisted scoring component alongside the current
  transparent rule-based scoring, while preserving explainability.
- Add historical replay and trend analysis across multiple simulated
  incidents.
- Extend the facility model to support configurable building layouts rather
  than a fixed 5-floor template.

---

## 9. Team Members

- **Ashutosh Singrole**

*(Add any additional team members here.)*

---

## 10. AI Assistance Disclosure

This project was built with assistance from AI tools, used as follows:

- **Claude (Anthropic)** — used for architecture planning, debugging, prompt
  drafting for other AI tools, and documentation (including this README).
- **Google Antigravity** (agentic IDE, using Claude Sonnet and Gemini models)
  — used to scaffold and wire the Flask backend, Next.js frontend, and
  connect the two.
- **Google Stitch** — used to generate the initial UI/UX design for the
  "Aegis Mission Control" dashboard, later imported and integrated into the
  Next.js codebase.

All AI-assisted code and design output was reviewed, tested, and iterated on
by the team before inclusion in this repository.
