import os
import random
import math
from collections import defaultdict

import osmnx as ox
import networkx as nx
import folium


# ============================================================
# CONFIGURATION
# ============================================================

GRAPH_FILE = "saltlake.osm"

NUM_VEHICLES = 500
RANDOM_SEED = 42

# One traffic observation window
TIME_WINDOW_MINUTES = 1

# Approximate lane capacity per minute.
# 1500 vehicles/hour/lane = 25 vehicles/minute/lane
LANE_CAPACITY_PER_MIN = 25

random.seed(RANDOM_SEED)


# ============================================================
# 1. LOAD ROAD NETWORK
# ============================================================

print("[1] Loading road network...")

G = ox.graph_from_xml(
    GRAPH_FILE,
    bidirectional=True,
    simplify=True,
    retain_all=True
)

# G = ox.load_graphml(GRAPH_FILE)

# # Convert IDs if necessary
# G = nx.MultiDiGraph(G)

print(f"Nodes : {len(G.nodes)}")
print(f"Edges : {len(G.edges)}")


# ============================================================
# 2. PREPARE EDGE CAPACITY
# ============================================================

print("[2] Preparing road capacities...")

for u, v, k, data in G.edges(keys=True, data=True):

    lanes = data.get("lanes", 1)

    try:
        if isinstance(lanes, list):
            lanes = lanes[0]

        lanes = int(float(str(lanes).split(";")[0]))

    except Exception:
        lanes = 1

    lanes = max(1, lanes)

    data["lanes_numeric"] = lanes

    # vehicles that can approximately pass during one minute
    data["capacity"] = lanes * LANE_CAPACITY_PER_MIN

    # default free-flow weight
    data["traffic_weight"] = float(
        data.get("length", 1)
    )


# ============================================================
# 3. CREATE SYNTHETIC TRAFFIC
# ============================================================

print("[3] Generating synthetic traffic...")

nodes = list(G.nodes)

vehicles = []

for vehicle_id in range(NUM_VEHICLES):

    origin = random.choice(nodes)
    destination = random.choice(nodes)

    # avoid same node
    while destination == origin:
        destination = random.choice(nodes)

    vehicles.append(
        {
            "id": vehicle_id,
            "origin": origin,
            "destination": destination,
        }
    )


# ============================================================
# 4. ROUTE VEHICLES
# ============================================================

print("[4] Routing vehicles...")

edge_load = defaultdict(int)

successful_routes = 0
failed_routes = 0

for vehicle in vehicles:

    origin = vehicle["origin"]
    destination = vehicle["destination"]

    try:

        path = nx.shortest_path(
            G,
            source=origin,
            target=destination,
            weight="traffic_weight"
        )

        vehicle["path"] = path

        successful_routes += 1

        # Count vehicles on every edge
        for u, v in zip(path[:-1], path[1:]):

            edge_load[(u, v)] += 1

    except nx.NetworkXNoPath:

        failed_routes += 1
        vehicle["path"] = []


print(f"Successful routes : {successful_routes}")
print(f"Failed routes     : {failed_routes}")


# ============================================================
# 5. CALCULATE CONGESTION
# ============================================================

print("[5] Detecting congestion...")

congestion_data = []

for u, v, k, data in G.edges(keys=True, data=True):

    load = edge_load.get((u, v), 0)

    capacity = data.get("capacity", LANE_CAPACITY_PER_MIN)

    utilization = load / max(capacity, 1)

    # --------------------------------------------------------
    # Congestion classification
    # --------------------------------------------------------

    if utilization < 0.40:
        level = "LOW"

    elif utilization < 0.70:
        level = "MEDIUM"

    elif utilization < 1.00:
        level = "HIGH"

    else:
        level = "CRITICAL"

    data["traffic_load"] = load
    data["utilization"] = utilization
    data["congestion"] = level

    congestion_data.append(
        {
            "u": u,
            "v": v,
            "load": load,
            "capacity": capacity,
            "utilization": utilization,
            "level": level,
        }
    )


# ============================================================
# 6. FIND MOST CONGESTED ROADS
# ============================================================

congestion_data.sort(
    key=lambda x: x["utilization"],
    reverse=True
)

print("\nTop congested road segments:")

for row in congestion_data[:10]:

    print(
        f"Road {row['u']} -> {row['v']} | "
        f"Load={row['load']} | "
        f"Capacity={row['capacity']} | "
        f"Utilization={row['utilization']:.2f} | "
        f"{row['level']}"
    )


# ============================================================
# 7. ADAPTIVE TRAFFIC MANAGEMENT
# ============================================================

print("\n[6] Adaptive traffic management...")

low_count = 0
medium_count = 0
high_count = 0
critical_count = 0

for row in congestion_data:

    level = row["level"]

    if level == "LOW":
        low_count += 1

    elif level == "MEDIUM":
        medium_count += 1

    elif level == "HIGH":
        high_count += 1

    elif level == "CRITICAL":
        critical_count += 1


print(f"LOW      roads : {low_count}")
print(f"MEDIUM   roads : {medium_count}")
print(f"HIGH     roads : {high_count}")
print(f"CRITICAL roads : {critical_count}")


# ============================================================
# 8. CREATE INTERACTIVE MAP
# ============================================================

print("[7] Creating traffic map...")

# center of network
lat = sum(G.nodes[n]["y"] for n in G.nodes) / len(G.nodes)
lon = sum(G.nodes[n]["x"] for n in G.nodes) / len(G.nodes)

m = folium.Map(
    location=[lat, lon],
    zoom_start=14,
    tiles="OpenStreetMap",
    attr="© OpenStreetMap contributors"
)


# ------------------------------------------------------------
# Road colors
# ------------------------------------------------------------

colors = {
    "LOW": "green",
    "MEDIUM": "yellow",
    "HIGH": "orange",
    "CRITICAL": "red",
}


# ------------------------------------------------------------
# Draw roads
# ------------------------------------------------------------

for u, v, k, data in G.edges(keys=True, data=True):

    geometry = data.get("geometry")

    if geometry is not None:

        points = [
            (lat, lon)
            for lon, lat in geometry.coords
        ]

    else:

        points = [
            (G.nodes[u]["y"], G.nodes[u]["x"]),
            (G.nodes[v]["y"], G.nodes[v]["x"]),
        ]

    level = data.get("congestion", "LOW")
    load = data.get("traffic_load", 0)
    capacity = data.get("capacity", 1)

    popup = (
        f"<b>Traffic Segment</b><br>"
        f"Traffic: {load}<br>"
        f"Capacity: {capacity}<br>"
        f"Congestion: {level}"
    )

    folium.PolyLine(
        points,
        color=colors.get(level, "blue"),
        weight=5 if level in ["HIGH", "CRITICAL"] else 3,
        opacity=0.8,
        popup=popup,
    ).add_to(m)


# ============================================================
# 9. DASHBOARD SUMMARY
# ============================================================

summary = f"""
<h4>Smart Traffic MVP</h4>

<b>Vehicles simulated:</b> {NUM_VEHICLES}<br>
<b>Successful routes:</b> {successful_routes}<br>
<b>Failed routes:</b> {failed_routes}<br>

<hr>

<b>Low:</b> {low_count}<br>
<b>Medium:</b> {medium_count}<br>
<b>High:</b> {high_count}<br>
<b>Critical:</b> {critical_count}
"""

folium.Marker(
    [lat, lon],
    popup=summary,
    tooltip="Smart Traffic Summary",
).add_to(m)


# ============================================================
# 10. SAVE
# ============================================================

OUTPUT_FILE = "smart_traffic.html"

m.save(OUTPUT_FILE)

print()
print("====================================")
print("SMART TRAFFIC MVP COMPLETED")
print("====================================")
print(f"Output: {OUTPUT_FILE}")
print()