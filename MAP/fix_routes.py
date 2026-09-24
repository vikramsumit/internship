import xml.etree.ElementTree as ET
from pathlib import Path

INPUT_FILE = Path("traffic.rou.xml")
OUTPUT_FILE = Path("traffic_sorted.rou.xml")


def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"{INPUT_FILE} not found")

    tree = ET.parse(INPUT_FILE)
    root = tree.getroot()

    vehicles = root.findall("vehicle")

    def departure_time(vehicle):
        return float(vehicle.get("depart", "0"))

    vehicles.sort(key=departure_time)

    # Remove vehicles from their original positions
    for vehicle in root.findall("vehicle"):
        root.remove(vehicle)

    # Add them back in chronological order
    for vehicle in vehicles:
        root.append(vehicle)

    tree.write(
        OUTPUT_FILE,
        encoding="utf-8",
        xml_declaration=True
    )

    print(f"Sorted {len(vehicles)} vehicles")
    print(f"Created: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()