import osmnx as ox

G = ox.graph_from_address(
    "Sector V, Salt Lake, Kolkata, West Bengal, India",
    dist=3000,
    network_type="drive",
    simplify=False
)

ox.settings.all_oneway = True
ox.io.save_graph_xml(G, filepath="saltlake.osm")

print(f"Nodes: {len(G.nodes)}")
print(f"Edges: {len(G.edges)}")