#!/usr/bin/env python3
"""Convert the existing Salt Lake OSM extract into a SUMO network.

This script deliberately leaves ``saltlake.osm`` untouched.  netconvert reads
it and writes the generated SUMO network next to it.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_OSM = ROOT / "saltlake.osm"
DEFAULT_NETWORK = ROOT / "saltlake.net.xml"


def network_summary(network_file: Path) -> dict[str, float | int]:
    """Return a small, dependency-free summary of a SUMO network."""
    root = ET.parse(network_file).getroot()
    edges = [
        edge
        for edge in root.findall("edge")
        if not edge.get("id", "").startswith(":") and edge.get("function") is None
    ]
    junctions = [
        junction
        for junction in root.findall("junction")
        if not junction.get("id", "").startswith(":")
    ]
    total_length = sum(
        float(lane.get("length", "0"))
        for edge in edges
        for lane in edge.findall("lane")[:1]
    )
    return {
        "edges": len(edges),
        "junctions": len(junctions),
        "traffic_lights": len(root.findall("tlLogic")),
        "road_km": total_length / 1000,
    }


def print_summary(summary: dict[str, float | int]) -> None:
    print("\nSUMO NETWORK\n------------")
    print(f"Nodes/Junctions : {summary['junctions']}")
    print(f"Edges           : {summary['edges']}")
    print(f"Traffic lights  : {summary['traffic_lights']}")
    print(f"Road length     : {summary['road_km']:.1f} km (first lane per edge)")


def build(osm_file: Path, network_file: Path) -> None:
    netconvert = shutil.which("netconvert")
    if netconvert is None:
        raise RuntimeError(
            "netconvert was not found. Install SUMO first: "
            "sudo apt update && sudo apt install sumo sumo-tools"
        )
    if not osm_file.is_file():
        raise FileNotFoundError(f"OSM source not found: {osm_file}")

    command = [
        netconvert,
        "--osm-files",
        str(osm_file),
        "--output-file",
        str(network_file),
        "--geometry.remove",
        "true",
        "--no-turnarounds",
        "true",
    ]
    print("Converting existing OSM data with netconvert...")
    print(" ".join(command))
    subprocess.run(command, check=True)

    if not network_file.is_file() or network_file.stat().st_size == 0:
        raise RuntimeError("netconvert did not create a usable network file.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the SUMO Salt Lake network.")
    parser.add_argument("--osm", type=Path, default=DEFAULT_OSM)
    parser.add_argument("--network", type=Path, default=DEFAULT_NETWORK)
    parser.add_argument(
        "--summary-only", action="store_true", help="Print an existing network summary."
    )
    args = parser.parse_args()

    try:
        if not args.summary_only:
            build(args.osm, args.network)
        if not args.network.is_file():
            raise FileNotFoundError(f"SUMO network not found: {args.network}")
        print_summary(network_summary(args.network))
        return 0
    except (OSError, RuntimeError, subprocess.CalledProcessError, ET.ParseError) as error:
        print(f"Network build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
