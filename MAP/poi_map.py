import osmnx as ox
import folium

# --------------------------------------------------
# 1. Get road network
# --------------------------------------------------
G = ox.graph_from_address(
    "Sector V, Salt Lake, Kolkata, West Bengal, India",
    dist=3000,
    network_type="drive"
)

# --------------------------------------------------
# 2. Get POIs from OpenStreetMap
# --------------------------------------------------
tags = {
    "amenity": [
        "hospital",
        "clinic",
        "police",
        "fire_station",
        "school",
        "college",
        "university",
        "pharmacy",
        "fuel",
        "bank",
        "atm",
        "parking",
        "restaurant"
    ],
    "highway": [
        "bus_stop"
    ],
    "railway": [
        "station",
        "halt",
        "subway"
    ],
    "leisure": [
        "park"
    ],
    "tourism": [
        "hotel",
        "attraction"
    ],
    "office": [
        "government"
    ]
}

pois = ox.features.features_from_address(
    address="Sector V, Salt Lake, Kolkata, West Bengal, India",
    tags=tags,
    dist=3000
)

print("POIs found:", len(pois))

# --------------------------------------------------
# 3. Centre of map
# --------------------------------------------------
center = [22.575, 88.43]

m = folium.Map(
    location=center,
    zoom_start=14,
    tiles="OpenStreetMap"
)

# --------------------------------------------------
# 4. Add road network
# --------------------------------------------------
nodes, edges = ox.graph_to_gdfs(G)

for _, row in edges.iterrows():
    coords = []

    if row.geometry:
        coords = [(lat, lon) for lon, lat in row.geometry.coords]

    if coords:
        folium.PolyLine(
            coords,
            weight=2,
            opacity=0.7
        ).add_to(m)

# --------------------------------------------------
# 5. POI colours/icons
# --------------------------------------------------
icons = {
    "hospital": ("red", "plus-sign"),
    "clinic": ("red", "plus-sign"),
    "police": ("blue", "star"),
    "fire_station": ("red", "fire"),
    "school": ("green", "education"),
    "college": ("green", "education"),
    "university": ("green", "education"),
    "pharmacy": ("pink", "plus"),
    "fuel": ("orange", "road"),
    "bank": ("darkgreen", "usd"),
    "atm": ("darkgreen", "credit-card"),
    "bus_stop": ("purple", "transfer"),
    "station": ("purple", "train"),
    "subway": ("purple", "road"),
    "park": ("green", "tree"),
    "hotel": ("cadetblue", "home"),
    "restaurant": ("orange", "cutlery"),
    "government": ("black", "flag")
}

# --------------------------------------------------
# 6. Add POI markers
# --------------------------------------------------
for _, row in pois.iterrows():

    geom = row.geometry

    if geom.geom_type == "Point":
        lat = geom.y
        lon = geom.x
    else:
        centroid = geom.centroid
        lat = centroid.y
        lon = centroid.x

    name = row.get("name", "Unnamed")

    category = None

    if row.get("amenity") in icons:
        category = row.get("amenity")
    elif row.get("highway") == "bus_stop":
        category = "bus_stop"
    elif row.get("railway") in icons:
        category = row.get("railway")
    elif row.get("leisure") in icons:
        category = row.get("leisure")
    elif row.get("tourism") in icons:
        category = row.get("tourism")
    elif row.get("office") == "government":
        category = "government"

    if category is None:
        continue

    color, icon = icons[category]

    folium.Marker(
        location=[lat, lon],
        popup=f"""
        <b>{name}</b><br>
        Category: {category}
        """,
        tooltip=name,
        icon=folium.Icon(
            color=color,
            icon=icon,
            prefix="glyphicon"
        )
    ).add_to(m)

# --------------------------------------------------
# 7. Save
# --------------------------------------------------
m.save("map.html")

print("Created: map.html")