#!/usr/bin/env python3
"""Run the mini smart-traffic simulation and write teacher-friendly metrics."""

from __future__ import annotations

import argparse
import csv
import importlib
import os
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from statistics import fmean
from typing import Any


ROOT = Path(__file__).resolve().parent
CONFIG_FILE = ROOT / "traffic.sumocfg"
NETWORK_FILE = ROOT / "saltlake.net.xml"
ROUTE_FILE = ROOT / "traffic.rou.xml"
DEFAULT_STEPS = 900
REPORT_EVERY = 60
MIN_GREEN = 10
MAX_GREEN = 45
EXTENSION_SECONDS = 8
ACTION_COOLDOWN = 8


def import_traci() -> Any:
    """Import TraCI, also supporting a normal SUMO installation's tools folder."""
    tools_dir = os.environ.get("SUMO_HOME")
    if tools_dir:
        tools_path = str(Path(tools_dir) / "tools")
        if tools_path not in sys.path:
            sys.path.append(tools_path)
    try:
        return importlib.import_module("traci")
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "TraCI is not installed in this Python environment. Activate .venv and run "
            "python -m pip install traci sumolib"
        ) from error


def congestion_level(speed: float, allowed_speed: float, halting: int, vehicles: int) -> str:
    """Classify an occupied edge from actual SUMO step data."""
    if vehicles == 0:
        return "FREE"
    ratio = speed / max(allowed_speed, 0.1)
    if ratio < 0.25 and halting >= 3:
        return "CRITICAL"
    if ratio < 0.40 or halting >= 3:
        return "HIGH"
    if ratio < 0.70 or halting >= 1:
        return "MODERATE"
    return "FREE"


def extract_controlled_lanes(controlled_links: Any) -> dict[int, set[str]]:
    """Map a signal-state index to the incoming lanes it controls."""
    lane_map: dict[int, set[str]] = defaultdict(set)
    for index, links in enumerate(controlled_links):
        for link in links:
            if link and link[0]:
                lane_map[index].add(link[0])
    return lane_map


class AdaptiveSignalController:
    """Safe, deliberately simple green-extension controller.

    It never jumps directly between phases.  A busy current green can be
    extended for a short period; a weak green is allowed to finish normally so
    SUMO's configured yellow/all-red transitions remain intact.
    """

    def __init__(self, traci: Any, enabled: bool) -> None:
        self.traci = traci
        self.enabled = enabled
        self.light_ids = list(traci.trafficlight.getIDList())
        self.lanes = {
            light_id: extract_controlled_lanes(traci.trafficlight.getControlledLinks(light_id))
            for light_id in self.light_ids
        }
        self.phase_started: dict[str, tuple[int, float]] = {}
        self.last_action: dict[str, float] = defaultdict(lambda: -ACTION_COOLDOWN)
        self.extensions = 0

    def update(self, now: float) -> None:
        if not self.enabled:
            return
        for light_id in self.light_ids:
            phase = self.traci.trafficlight.getPhase(light_id)
            previous_phase, phase_time = self.phase_started.get(light_id, (phase, now))
            if phase != previous_phase:
                phase_time = now
            self.phase_started[light_id] = (phase, phase_time)
            elapsed = now - phase_time
            if elapsed < MIN_GREEN or elapsed >= MAX_GREEN:
                continue
            if now - self.last_action[light_id] < ACTION_COOLDOWN:
                continue

            state = self.traci.trafficlight.getRedYellowGreenState(light_id)
            queues = {
                index: sum(self.traci.lane.getLastStepHaltingNumber(lane) for lane in lanes)
                for index, lanes in self.lanes[light_id].items()
            }
            served = sum(
                queues.get(index, 0)
                for index, signal in enumerate(state)
                if signal in "gG"
            )
            competing = max(
                (queue for index, queue in queues.items() if index >= len(state) or state[index] not in "gG"),
                default=0,
            )
            # Extend only a genuinely busy green. A busier competing approach
            # simply gets the next default phase, which is safer than a jump.
            if served >= 2 and served >= competing:
                remaining = int(MAX_GREEN - elapsed)
                if remaining > 0:
                    self.traci.trafficlight.setPhaseDuration(
                        light_id, min(EXTENSION_SECONDS, remaining)
                    )
                    self.last_action[light_id] = now
                    self.extensions += 1


def edge_snapshot(traci: Any, edge_ids: set[str], speed_cache: dict[str, float]) -> tuple[int, int, int]:
    """Inspect only occupied normal edges to keep TraCI calls laptop-friendly."""
    congested = 0
    max_queue = 0
    observed = 0
    for edge_id in edge_ids:
        if not edge_id or edge_id.startswith(":"):
            continue
        vehicles = traci.edge.getLastStepVehicleNumber(edge_id)
        if vehicles == 0:
            continue
        observed += 1
        speed = traci.edge.getLastStepMeanSpeed(edge_id)
        halting = traci.edge.getLastStepHaltingNumber(edge_id)
        if edge_id not in speed_cache:
            try:
                speed_cache[edge_id] = traci.lane.getMaxSpeed(f"{edge_id}_0")
            except Exception:
                speed_cache[edge_id] = 13.9
        level = congestion_level(speed, speed_cache[edge_id], halting, vehicles)
        if level in {"HIGH", "CRITICAL"}:
            congested += 1
        max_queue = max(max_queue, halting)
    return congested, max_queue, observed


def print_banner(light_count: int, mode: str) -> None:
    print("============================================")
    print("2-D DIGITAL TWIN — SMART TRAFFIC MVP")
    print("============================================")
    print("Area: Salt Lake / Sector V, Kolkata")
    print(f"Traffic lights detected: {light_count}")
    print(f"Mode: {mode.upper()}")
    if light_count == 0:
        print("Adaptive controller unavailable: no traffic lights in this SUMO network.")
    print("--------------------------------------------")


def write_csv(path: Path, rows: list[dict[str, float | int]]) -> None:
    fields = [
        "time_s",
        "active_vehicles",
        "mean_speed_mps",
        "halting_vehicles",
        "current_waiting_s",
        "congested_edges",
        "observed_edges",
        "max_edge_queue",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def maybe_plot(rows: list[dict[str, float | int]], output: Path) -> bool:
    try:
        import matplotlib.pyplot as plt
    except ModuleNotFoundError:
        return False
    times = [row["time_s"] for row in rows]
    figure, axes = plt.subplots(3, 1, figsize=(9, 8), sharex=True)
    axes[0].plot(times, [row["active_vehicles"] for row in rows], color="#1f77b4")
    axes[0].set_ylabel("Active vehicles")
    axes[1].plot(times, [row["mean_speed_mps"] for row in rows], color="#2ca02c")
    axes[1].set_ylabel("Mean speed (m/s)")
    axes[2].plot(times, [row["halting_vehicles"] for row in rows], color="#d62728")
    axes[2].set_ylabel("Halting vehicles")
    axes[2].set_xlabel("Simulation time (s)")
    figure.suptitle("Salt Lake Smart Traffic MVP")
    figure.tight_layout()
    figure.savefig(output, dpi=150)
    plt.close(figure)
    return True


def run_single(
    traci: Any,
    binary: str,
    mode: str,
    gui: bool,
    steps: int,
    csv_path: Path,
    plot_path: Path | None,
) -> dict[str, float | int | str]:
    command = [binary, "-c", str(CONFIG_FILE), "--quit-on-end"]
    if gui:
        command.extend(["--start", "--delay", "340"])
    rows: list[dict[str, float | int]] = []
    completed = 0
    waiting_vehicle_seconds = 0
    max_queue = 0
    speed_cache: dict[str, float] = {}

    traci.start(command)
    try:
        controller = AdaptiveSignalController(traci, enabled=(mode == "adaptive"))
        # Small in-memory twin state for future evacuation/API integration.
        city_state: dict[str, Any] = {
            "simulation_time": 0,
            "roads": {},
            "traffic_lights": {"detected": controller.light_ids},
            "vehicles": {},
            "events": [],
        }
        print_banner(len(controller.light_ids), mode)
        for _ in range(steps):
            if traci.simulation.getMinExpectedNumber() == 0:
                break
            traci.simulationStep()
            now = traci.simulation.getTime()
            active_ids = list(traci.vehicle.getIDList())
            speeds = [traci.vehicle.getSpeed(vehicle_id) for vehicle_id in active_ids]
            edge_ids = {traci.vehicle.getRoadID(vehicle_id) for vehicle_id in active_ids}
            halting = sum(speed < 0.1 for speed in speeds)
            congested, edge_queue, observed_edges = edge_snapshot(traci, edge_ids, speed_cache)
            current_waiting = sum(
                traci.vehicle.getWaitingTime(vehicle_id) for vehicle_id in active_ids
            )
            waiting_vehicle_seconds += halting
            max_queue = max(max_queue, edge_queue)
            completed += traci.simulation.getArrivedNumber()
            controller.update(now)
            city_state["simulation_time"] = int(now)
            city_state["roads"] = {
                "congested_edges": congested,
                "observed_edges": observed_edges,
                "maximum_queue": edge_queue,
            }
            city_state["vehicles"] = {"active": len(active_ids), "completed": completed}
            city_state["traffic_lights"]["adaptive_green_extensions"] = controller.extensions
            row: dict[str, float | int] = {
                "time_s": int(now),
                "active_vehicles": len(active_ids),
                "mean_speed_mps": round(fmean(speeds), 3) if speeds else 0.0,
                "halting_vehicles": halting,
                "current_waiting_s": round(current_waiting, 3),
                "congested_edges": congested,
                "observed_edges": observed_edges,
                "max_edge_queue": edge_queue,
            }
            rows.append(row)
            if int(now) % REPORT_EVERY == 0:
                print(
                    f"Time: {int(now):3d} s | Vehicles: {len(active_ids):3d} | "
                    f"Mean speed: {row['mean_speed_mps']:.2f} m/s | "
                    f"Halting: {halting:3d} | Congested edges: {congested}"
                )
    finally:
        # TraCI owns the spawned SUMO process; wait for a clean shutdown so no
        # SUMO process is left behind after a completed or failed run.
        traci.close()

    write_csv(csv_path, rows)
    if plot_path is not None and rows and not maybe_plot(rows, plot_path):
        print("Plot skipped: matplotlib is not installed.")
    mean_speed = fmean([float(row["mean_speed_mps"]) for row in rows]) if rows else 0.0
    peak_active = max((int(row["active_vehicles"]) for row in rows), default=0)
    return {
        "mode": mode,
        "vehicles_completed": completed,
        "average_speed_mps": round(mean_speed, 3),
        "total_waiting_vehicle_seconds": waiting_vehicle_seconds,
        "average_waiting_seconds_per_completed": round(
            waiting_vehicle_seconds / completed, 3
        )
        if completed
        else 0.0,
        "maximum_queue": max_queue,
        "peak_active_vehicles": peak_active,
        "adaptive_green_extensions": controller.extensions,
        "metrics_file": csv_path.name,
    }


def write_summary(path: Path, summaries: list[dict[str, float | int | str]]) -> None:
    lines = ["2-D DIGITAL TWIN — SMART TRAFFIC MVP", "", "FINAL METRICS", "-------------"]
    for summary in summaries:
        lines.extend(
            [
                f"Mode                         : {str(summary['mode']).upper()}",
                f"Vehicles completed           : {summary['vehicles_completed']}",
                f"Average speed                : {summary['average_speed_mps']} m/s",
                f"Total waiting time           : {summary['total_waiting_vehicle_seconds']} vehicle-seconds",
                f"Average waiting / completed  : {summary['average_waiting_seconds_per_completed']} s",
                f"Maximum queue                : {summary['maximum_queue']} vehicles",
                f"Peak active vehicles         : {summary['peak_active_vehicles']}",
                f"Adaptive green extensions    : {summary['adaptive_green_extensions']}",
                f"Metrics CSV                  : {summary['metrics_file']}",
                "",
            ]
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def write_comparison(path: Path, summaries: list[dict[str, float | int | str]]) -> None:
    fields = [key for key in summaries[0] if key not in {"mode", "metrics_file"}]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["metric", "baseline", "adaptive"])
        writer.writeheader()
        baseline, adaptive = summaries
        for field in fields:
            writer.writerow({"metric": field, "baseline": baseline[field], "adaptive": adaptive[field]})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Salt Lake SUMO traffic MVP.")
    parser.add_argument("--mode", choices=("baseline", "adaptive"), default="baseline")
    parser.add_argument("--compare", action="store_true", help="Run baseline then adaptive mode.")
    parser.add_argument("--gui", action="store_true", help="Use sumo-gui for a visual demonstration.")
    parser.add_argument("--steps", type=int, default=DEFAULT_STEPS)
    parser.add_argument("--no-plot", action="store_true")
    args = parser.parse_args()
    if args.steps < 1:
        parser.error("--steps must be at least 1")
    missing = [path.name for path in (NETWORK_FILE, ROUTE_FILE, CONFIG_FILE) if not path.is_file()]
    if missing:
        print(f"Missing required files: {', '.join(missing)}", file=sys.stderr)
        print("Run: python build_network.py && python generate_routes.py --level high", file=sys.stderr)
        return 1
    binary = shutil.which("sumo-gui" if args.gui else "sumo")
    if binary is None:
        print("SUMO executable not found. Install it with: sudo apt install sumo sumo-tools", file=sys.stderr)
        return 1
    try:
        traci = import_traci()
        modes = ["baseline", "adaptive"] if args.compare else [args.mode]
        if args.compare and args.gui:
            print("Comparison uses two GUI runs; close each finished GUI window if it remains open.")
        summaries = []
        for mode in modes:
            csv_path = ROOT / (f"{mode}_metrics.csv" if args.compare else "traffic_metrics.csv")
            plot_path = None if args.no_plot else ROOT / (
                f"{mode}_metrics.png" if args.compare else "traffic_metrics.png"
            )
            summaries.append(run_single(traci, binary, mode, args.gui, args.steps, csv_path, plot_path))
        write_summary(ROOT / "traffic_summary.txt", summaries)
        if args.compare:
            write_comparison(ROOT / "comparison.csv", summaries)
        print("--------------------------------------------")
        for summary in summaries:
            print(
                f"{str(summary['mode']).upper()}: completed={summary['vehicles_completed']}, "
                f"average speed={summary['average_speed_mps']} m/s, "
                f"waiting={summary['total_waiting_vehicle_seconds']} vehicle-seconds"
            )
        print("Simulation finished successfully.")
        return 0
    except (RuntimeError, OSError, csv.Error) as error:
        print(f"Simulation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
