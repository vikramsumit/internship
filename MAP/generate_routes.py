#!/usr/bin/env python3
"""Generate deterministic, converging synthetic traffic for the SUMO MVP."""

from __future__ import annotations

import argparse
import random
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import networkx as nx


ROOT = Path(__file__).resolve().parent
DEFAULT_NETWORK = ROOT / "saltlake.net.xml"
DEFAULT_ROUTES = ROOT / "traffic.rou.xml"
LEVEL_VEHICLES = {"low": 50, "medium": 150, "high": 300}
DEFAULT_SEED = 42
DEMAND_WINDOW_SECONDS = 180


def load_driveable_graph(network_file: Path) -> tuple[nx.DiGraph, dict[str, tuple[float, float]]]:
    """Read normal SUMO edges into a weighted directed graph.

    SUMO's internal connector edges begin with ':' and must never be used in a
    vehicle route definition.
    """
    root = ET.parse(network_file).getroot()
    graph = nx.DiGraph()
    coordinates: dict[str, tuple[float, float]] = {}
    for junction in root.findall("junction"):
        junction_id = junction.get("id", "")
        if not junction_id.startswith(":"):
            coordinates[junction_id] = (
                float(junction.get("x", "0")),
                float(junction.get("y", "0")),
            )

    for edge in root.findall("edge"):
        edge_id = edge.get("id", "")
        source, target = edge.get("from"), edge.get("to")
        lane = edge.find("lane")
        if (
            edge_id.startswith(":")
            or edge.get("function") is not None
            or source is None
            or target is None
            or lane is None
        ):
            continue
        speed = max(float(lane.get("speed", "1")), 1.0)
        cost = float(lane.get("length", "1")) / speed
        # A DiGraph keeps the cheapest physical edge for node-to-node routing.
        if not graph.has_edge(source, target) or cost < graph[source][target]["weight"]:
            graph.add_edge(source, target, edge_id=edge_id, weight=cost)
    return graph, coordinates


def choose_hub(graph: nx.DiGraph, coordinates: dict[str, tuple[float, float]]) -> tuple[nx.DiGraph, str]:
    """Choose a central junction in the largest strongly connected component."""
    component = max(nx.strongly_connected_components(graph), key=len)
    connected = graph.subgraph(component).copy()
    points = [coordinates[node] for node in connected if node in coordinates]
    if not points:
        raise RuntimeError("No usable junction coordinates were found in the SUMO network.")
    centre_x = sum(point[0] for point in points) / len(points)
    centre_y = sum(point[1] for point in points) / len(points)
    hub = min(
        (node for node in connected if node in coordinates),
        key=lambda node: (coordinates[node][0] - centre_x) ** 2
        + (coordinates[node][1] - centre_y) ** 2,
    )
    return connected, hub


def edge_route(graph: nx.DiGraph, node_path: list[str]) -> list[str]:
    return [graph[source][target]["edge_id"] for source, target in zip(node_path, node_path[1:])]


def write_routes(
    network_file: Path, route_file: Path, vehicle_count: int, seed: int
) -> tuple[int, str]:
    graph, coordinates = load_driveable_graph(network_file)
    if not graph:
        raise RuntimeError("The SUMO network has no driveable edges.")
    graph, hub = choose_hub(graph, coordinates)
    # Travel time to the hub gives a reliable set of non-trivial origins.
    distances = nx.single_source_dijkstra_path_length(graph.reverse(copy=False), hub, weight="weight")
    candidates = [node for node, seconds in distances.items() if seconds >= 45]
    if len(candidates) < 2:
        candidates = [node for node in graph if node != hub]
    if not candidates:
        raise RuntimeError("Could not find valid origins for synthetic traffic.")

    rng = random.Random(seed)
    root = ET.Element("routes")
    ET.SubElement(
        root,
        "vType",
        id="car",
        accel="2.6",
        decel="4.5",
        sigma="0.5",
        length="5.0",
        minGap="2.5",
        maxSpeed="13.9",
        guiShape="passenger",
    )

    written = 0
    attempts = 0
    while written < vehicle_count and attempts < vehicle_count * 20:
        attempts += 1
        origin = rng.choice(candidates)
        try:
            nodes = nx.shortest_path(graph, origin, hub, weight="weight")
        except nx.NetworkXNoPath:
            continue
        edges = edge_route(graph, nodes)
        if not edges:
            continue
        # Packed, randomized departures produce real queues at shared approach roads.
        depart = 5 + rng.randrange(DEMAND_WINDOW_SECONDS)
        vehicle = ET.SubElement(
            root,
            "vehicle",
            id=f"car_{written:04d}",
            type="car",
            depart=str(depart),
            departLane="best",
            departSpeed="max",
        )
        ET.SubElement(vehicle, "route", edges=" ".join(edges))
        written += 1

    if written != vehicle_count:
        raise RuntimeError(f"Only generated {written} of {vehicle_count} requested routes.")
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(route_file, encoding="utf-8", xml_declaration=True)
    return written, hub


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate repeatable SUMO traffic demand.")
    parser.add_argument("--network", type=Path, default=DEFAULT_NETWORK)
    parser.add_argument("--output", type=Path, default=DEFAULT_ROUTES)
    parser.add_argument("--level", choices=LEVEL_VEHICLES, default="high")
    parser.add_argument("--vehicles", type=int, help="Override the selected traffic level.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()
    vehicles = args.vehicles if args.vehicles is not None else LEVEL_VEHICLES[args.level]
    if vehicles < 1:
        parser.error("--vehicles must be at least 1")
    if not args.network.is_file():
        print(f"SUMO network not found: {args.network}. Run python build_network.py first.", file=sys.stderr)
        return 1
    try:
        written, hub = write_routes(args.network, args.output, vehicles, args.seed)
    except (ET.ParseError, OSError, RuntimeError, nx.NetworkXException) as error:
        print(f"Route generation failed: {error}", file=sys.stderr)
        return 1
    print("SYNTHETIC TRAFFIC DEMAND")
    print("-----------------------")
    print(f"Vehicles       : {written}")
    print(f"Traffic level  : {args.level.upper()}")
    print(f"Random seed    : {args.seed}")
    print(f"Convergence hub: {hub}")
    print(f"Route file     : {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
