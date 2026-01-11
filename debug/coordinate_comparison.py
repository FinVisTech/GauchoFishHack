#!/usr/bin/env python3
"""
Compare coordinate transformations between Python and TypeScript approaches
"""

import json
from pathlib import Path

# Load sample path data
base_path = Path(__file__).parent.parent / 'src' / 'data' / 'ucsb-library'

with open(base_path / 'nodes.json') as f:
    nodes = json.load(f)

# Get nodes for room 2312
room_nodes = [n for n in nodes if n.get('room_num') == 2312]
if room_nodes:
    sample_node = room_nodes[0]
    print("Sample node for room 2312:")
    print(f"  ID: {sample_node['id']}")
    print(f"  Graph coords: ({sample_node['x']}, {sample_node['y']})")
    print(f"  Floor: {sample_node['floor']}")
    
    # Python approach (PIL)
    print("\nPython (PIL) conversion:")
    print(f"  Image X = {int(sample_node['x'])}")
    print(f"  Image Y = {int(-sample_node['y'])}  (negate Y)")
    
    # TypeScript SVG approach (current)
    print("\nTypeScript SVG (current):")
    print(f"  viewBox: 0 -1560 1369 1560")
    print(f"  SVG X = {sample_node['x']} (direct)")
    print(f"  SVG Y = {sample_node['y']} (direct, negative)")
    print(f"  Problem: SVG parent has transform applied!")
    
    # What it SHOULD be
    print("\nWhat TypeScript SHOULD use:")
    print(f"  viewBox: 0 0 1369 1560")
    print(f"  SVG X = {sample_node['x']}")
    print(f"  SVG Y = {int(-sample_node['y'])}  (negate Y to match image coords)")

print("\n" + "="*60)
print("DIAGNOSIS:")
print("="*60)
print("The SVG is inside a div with transform: translate() and scale()")
print("This causes the SVG to be transformed along with the background image.")
print("\nSOLUTION OPTIONS:")
print("1. Move SVG outside the transformed div")
print("2. Use image coordinates (0,0 to 1369,1560) and negate Y")
print("3. Counter-transform the SVG to undo parent transforms")
