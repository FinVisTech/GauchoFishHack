#!/usr/bin/env python3
"""
Convert GPKG files to JSON for use in the web application.
Requires: pip install geopandas
"""

import json
import sys
from pathlib import Path

try:
    import geopandas as gpd
    import pandas as pd
except ImportError:
    print("Error: geopandas not installed. Install with: pip install geopandas")
    sys.exit(1)

def convert_nodes(gpkg_path: str, output_path: str):
    """Convert nodes.gpkg to JSON"""
    gdf = gpd.read_file(gpkg_path)
    
    nodes = []
    for idx, row in gdf.iterrows():
        geom = row['geometry']
        node = {
            'id': int(idx),
            'type': int(row['type']) if not pd.isna(row['type']) else None,
            'room_num': int(row['room_num']) if not pd.isna(row['room_num']) else None,
            'floor': int(row['floor']) if not pd.isna(row['floor']) else None,
            'connector_id': int(row['connector_id']) if not pd.isna(row['connector_id']) else None,
            'name': row['name'] if row['name'] not in [None, 'None'] else None,
            'x': float(geom.x),
            'y': float(geom.y)
        }
        nodes.append(node)
    
    with open(output_path, 'w') as f:
        json.dump(nodes, f, indent=2)
    
    print(f"✅ Converted {len(nodes)} nodes to {output_path}")

def convert_edges(gpkg_path: str, output_path: str):
    """Convert edges.gpkg to JSON"""
    gdf = gpd.read_file(gpkg_path)
    
    edges = []
    for idx, row in gdf.iterrows():
        edge = {
            'id': int(idx),
            'from_id': int(row['from_id']) - 1,  # Adjust to 0-based indexing
            'to_id': int(row['to_id']) - 1,      # Adjust to 0-based indexing
            'weight': float(row['weight']),
            'floor': int(row['floor']) if not pd.isna(row['floor']) else None
        }
        edges.append(edge)
    
    with open(output_path, 'w') as f:
        json.dump(edges, f, indent=2)
    
    print(f"✅ Converted {len(edges)} edges to {output_path}")

def main():
    base_path = Path(__file__).parent.parent / 'src' / 'data' / 'ucsb-library'
    
    nodes_gpkg = base_path / 'nodes.gpkg'
    edges_gpkg = base_path / 'edges.gpkg'
    
    nodes_json = base_path / 'nodes.json'
    edges_json = base_path / 'edges.json'
    
    if not nodes_gpkg.exists():
        print(f"❌ Error: {nodes_gpkg} not found")
        sys.exit(1)
    
    if not edges_gpkg.exists():
        print(f"❌ Error: {edges_gpkg} not found")
        sys.exit(1)
    
    print("Converting GPKG files to JSON...")
    convert_nodes(str(nodes_gpkg), str(nodes_json))
    convert_edges(str(edges_gpkg), str(edges_json))
    print("\n✅ Conversion complete!")

if __name__ == '__main__':
    main()
