"""
Synthetic Security Telemetry Generator
----------------------------------------
Generates a JSON event stream for a simulated multi-floor office building,
containing normal background noise plus one hidden coordinated attack
(lateral movement from a compromised IoT camera to a server-room device).

Usage:
    python generate_telemetry.py
    -> writes telemetry.json in the current directory
"""

import json
import random
import uuid
from datetime import datetime, timedelta

random.seed()  # Randomized for each run

# ---------------------------------------------------------------------------
# Building layout: 5 floors, ~40 devices
# ---------------------------------------------------------------------------

FLOORS = [1, 2, 3, 4, 5]

DEVICE_TYPES = ["camera", "badge_reader", "workstation", "server", "iot_sensor", "router"]

NETWORK_SEGMENTS = {
    1: "vlan-servers",
    2: "vlan-iot",
    3: "vlan-corp",
    4: "vlan-corp",
    5: "vlan-guest",
}


def build_devices():
    devices = []
    device_id_counter = 1

    for floor in FLOORS:
        # Each floor gets a realistic mix of device types
        floor_device_plan = {
            "camera": 2,
            "badge_reader": 2,
            "workstation": 4,
            "iot_sensor": 2,
            "router": 1,
        }
        # Server room only exists on floor 1
        if floor == 1:
            floor_device_plan["server"] = 3

        for dtype, count in floor_device_plan.items():
            for _ in range(count):
                device_id = f"dev-{device_id_counter:03d}"
                device_id_counter += 1
                devices.append(
                    {
                        "id": device_id,
                        "type": dtype,
                        "floor": floor,
                        "network_segment": NETWORK_SEGMENTS[floor],
                        "connected_devices": [],  # filled in below
                    }
                )
    return devices


def wire_topology(devices):
    """
    Give devices plausible network relationships:
    - Each device on a floor connects to that floor's router.
    - Routers on the same VLAN connect to each other (simulating shared VLAN).
    - This shared-VLAN link between floor 2 (iot) and floor 1 (servers) is the
      structural weakness the attack scenario will exploit.
    """
    routers_by_floor = {
        d["floor"]: d["id"] for d in devices if d["type"] == "router"
    }

    for d in devices:
        if d["type"] != "router":
            router_id = routers_by_floor[d["floor"]]
            d["connected_devices"].append(router_id)

    # Cross-floor VLAN link: Random floor improperly bridged to
    # the servers VLAN (floor 1) -- a realistic misconfiguration.
    vulnerable_floor = random.choice([2, 3, 4, 5])
    router_vulnerable = routers_by_floor[vulnerable_floor]
    router_floor_1 = routers_by_floor[1]
    for d in devices:
        if d["id"] == router_vulnerable:
            d["connected_devices"].append(router_floor_1)
        if d["id"] == router_floor_1:
            d["connected_devices"].append(router_vulnerable)

    return devices


# ---------------------------------------------------------------------------
# Event generation
# ---------------------------------------------------------------------------

EVENT_TYPES_NORMAL = ["badge_swipe", "login", "sensor_ping", "network_heartbeat"]


def rand_timestamp(base_time, window_minutes):
    offset = random.uniform(0, window_minutes * 60)
    return base_time + timedelta(seconds=offset)


def make_event(event_type, device_id, floor, target_device_id=None, timestamp=None,
                extra=None):
    event = {
        "event_id": str(uuid.uuid4())[:8],
        "timestamp": timestamp.isoformat(),
        "device_id": device_id,
        "floor": floor,
        "event_type": event_type,
        "target_device_id": target_device_id,
    }
    if extra:
        event.update(extra)
    return event


def generate_background_noise(devices, base_time, window_minutes, count=300):
    events = []
    for _ in range(count):
        device = random.choice(devices)
        event_type = random.choice(EVENT_TYPES_NORMAL)
        ts = rand_timestamp(base_time, window_minutes)

        target = None
        if event_type == "network_heartbeat" and device["connected_devices"]:
            target = random.choice(device["connected_devices"])

        events.append(
            make_event(event_type, device["id"], device["floor"], target, ts)
        )
    return events


def generate_attack_scenario(devices, base_time, window_minutes):
    """
    Hidden coordinated attack, injected into the timeline:

    1. Compromised IoT camera on floor 2 starts unusual outbound connections.
    2. Camera pivots across the shared VLAN to a floor-1 server.
    3. Suspicious authentication attempt occurs on the compromised server.
    4. A brief privilege escalation event follows.

    Events are deliberately spread with some delay/out-of-order jitter to
    simulate real (imperfect) telemetry, per the problem statement's
    constraint that telemetry may be incomplete, duplicated, delayed, or
    out of order.
    """
    # Find the floor that is bridged to floor 1
    server_router = next(d for d in devices if d["type"] == "router" and d["floor"] == 1)
    bridged_routers = [d for d in devices if d["type"] == "router" and d["id"] in server_router["connected_devices"]]
    vulnerable_floor = bridged_routers[0]["floor"] if bridged_routers else 2

    # Pick a random camera or iot_sensor on the vulnerable floor
    potential_attackers = [d for d in devices if d["type"] in ["camera", "iot_sensor"] and d["floor"] == vulnerable_floor]
    attacker = random.choice(potential_attackers)
    
    # Pick a random server on floor 1
    potential_targets = [d for d in devices if d["type"] == "server" and d["floor"] == 1]
    server = random.choice(potential_targets)

    # Attack happens roughly 70-85% into the time window
    attack_start = base_time + timedelta(minutes=window_minutes * 0.72)

    events = []

    # Step 1: camera starts anomalous outbound scanning behavior
    t1 = attack_start
    events.append(
        make_event(
            "anomalous_outbound_connection",
            attacker["id"],
            attacker["floor"],
            timestamp=t1,
            extra={"note": "unexpected outbound connection volume"},
        )
    )

    # Step 2: lateral movement across shared VLAN to the server (delayed a bit,
    # simulating network jitter / late telemetry arrival)
    t2 = t1 + timedelta(seconds=random.uniform(30, 90))
    events.append(
        make_event(
            "lateral_movement",
            attacker["id"],
            attacker["floor"],
            target_device_id=server["id"],
            timestamp=t2,
            extra={"network_segment_crossed": True},
        )
    )

    # Step 3: suspicious auth attempt on the server (arrives slightly
    # out of order relative to t2, to simulate real-world jitter)
    t3 = t2 + timedelta(seconds=random.uniform(-15, 45))
    events.append(
        make_event(
            "suspicious_auth_attempt",
            server["id"],
            server["floor"],
            timestamp=t3,
            extra={"auth_result": "failed_then_succeeded", "attempts": 4},
        )
    )

    # Step 4: privilege escalation shortly after
    t4 = t3 + timedelta(seconds=random.uniform(20, 60))
    events.append(
        make_event(
            "privilege_escalation",
            server["id"],
            server["floor"],
            timestamp=t4,
            extra={"escalated_to": "admin"},
        )
    )

    # Duplicate one event, as real telemetry pipelines often do
    events.append(dict(events[1]))

    return events, {
        "attacker_id": attacker["id"],
        "server_id": server["id"],
        "attack_window": [t1.isoformat(), t4.isoformat()],
    }


def main():
    base_time = datetime(2026, 8, 23, 20, 0, 0)
    window_minutes = 120

    devices = build_devices()
    devices = wire_topology(devices)

    noise_events = generate_background_noise(devices, base_time, window_minutes, count=300)
    attack_events, attack_meta = generate_attack_scenario(devices, base_time, window_minutes)

    all_events = noise_events + attack_events
    all_events.sort(key=lambda e: e["timestamp"])  # mostly ordered, jitter still present

    output = {
        "devices": devices,
        "events": all_events,
        "ground_truth": {
            "attack_present": True,
            "description": (
                f"Compromised IoT device on floor {attack_meta.get('attacker_id', 'unknown')} pivots across a shared VLAN "
                "to a floor-1 server, followed by a suspicious auth attempt and "
                "privilege escalation."
            ),
            **attack_meta,
        },
    }

    with open("telemetry.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Generated {len(devices)} devices and {len(all_events)} events.")
    print(f"Attack path: {attack_meta['attacker_id']} -> {attack_meta['server_id']}")
    print("Saved to telemetry.json")


if __name__ == "__main__":
    main()
