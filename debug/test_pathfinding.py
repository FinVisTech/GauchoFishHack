#!/usr/bin/env python3
"""
Debug script to test pathfinding and path visualization.
This isolates the logic to verify it works correctly.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import heapq

# Pillow for image manipulation
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Error: Pillow not installed. Install with: pip install Pillow")
    sys.exit(1)


class GraphNode:
    def __init__(self, data: dict):
        self.id: int = data['id']
        self.type: Optional[int] = data.get('type')
        self.room_num: Optional[int] = data.get('room_num')
        self.floor: Optional[int] = data.get('floor')
        self.connector_id: Optional[int] = data.get('connector_id')
        self.name: Optional[str] = data.get('name')
        self.x: float = data['x']
        self.y: float = data['y']


class GraphEdge:
    def __init__(self, data: dict):
        self.id: int = data['id']
        self.from_id: int = data['from_id']
        self.to_id: int = data['to_id']
        self.weight: float = data['weight']
        self.floor: Optional[int] = data.get('floor')


class Entrance:
    def __init__(self, data: dict):
        self.id: int = data['id']
        self.name: str = data['name']
        self.lat: float = data['lat']
        self.lng: float = data['lng']
        self.node: int = data['node']


class WeightedGraph:
    def __init__(self):
        self.nodes: Dict[int, GraphNode] = {}
        self.adjacency_list: Dict[int, List[Tuple[int, float]]] = defaultdict(list)
        self.entrances: List[Entrance] = []
    
    def build(self, nodes_data: list, edges_data: list, entrances_data: list):
        """Build graph from data"""
        # Load nodes
        for node_data in nodes_data:
            node = GraphNode(node_data)
            self.nodes[node.id] = node
        
        # Build adjacency list (undirected)
        for edge_data in edges_data:
            edge = GraphEdge(edge_data)
            self.adjacency_list[edge.from_id].append((edge.to_id, edge.weight))
            self.adjacency_list[edge.to_id].append((edge.from_id, edge.weight))
        
        # Load entrances
        self.entrances = [Entrance(e) for e in entrances_data]
    
    def dijkstra(self, start_id: int, end_id: int) -> Optional[List[int]]:
        """Dijkstra's shortest path algorithm"""
        if start_id not in self.nodes or end_id not in self.nodes:
            return None
        
        distances = {node_id: float('inf') for node_id in self.nodes}
        distances[start_id] = 0
        previous = {node_id: None for node_id in self.nodes}
        
        # Priority queue: (distance, node_id)
        pq = [(0, start_id)]
        visited = set()
        
        while pq:
            current_dist, current = heapq.heappop(pq)
            
            if current in visited:
                continue
            
            visited.add(current)
            
            if current == end_id:
                break
            
            for neighbor, weight in self.adjacency_list[current]:
                if neighbor in visited:
                    continue
                
                new_dist = current_dist + weight
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))
        
        # Reconstruct path
        if distances[end_id] == float('inf'):
            return None
        
        path = []
        current = end_id
        while current is not None:
            path.insert(0, current)
            current = previous[current]
        
        return path
    
    def find_nodes_by_room(self, room_num: int) -> List[GraphNode]:
        """Find all nodes with given room number"""
        return [node for node in self.nodes.values() if node.room_num == room_num]
    
    def find_path_to_room(self, room_num: int, entrance: Entrance) -> Optional[List[GraphNode]]:
        """Find shortest path from entrance to room"""
        room_nodes = self.find_nodes_by_room(room_num)
        if not room_nodes:
            print(f"❌ No nodes found for room {room_num}")
            return None
        
        start_node_id = entrance.node
        
        # Try to find path to each room node
        best_path = None
        best_length = float('inf')
        
        for room_node in room_nodes:
            path_ids = self.dijkstra(start_node_id, room_node.id)
            if path_ids and len(path_ids) < best_length:
                best_path = path_ids
                best_length = len(path_ids)
        
        if not best_path:
            print(f"❌ No path found to room {room_num}")
            return None
        
        # Convert IDs to nodes
        path_nodes = [self.nodes[node_id] for node_id in best_path]
        return path_nodes


def load_graph(building_id: str = 'ucsb-library') -> WeightedGraph:
    """Load graph data"""
    base_path = Path(__file__).parent.parent / 'src' / 'data' / building_id
    
    with open(base_path / 'nodes.json') as f:
        nodes_data = json.load(f)
    
    with open(base_path / 'edges.json') as f:
        edges_data = json.load(f)
    
    with open(base_path / 'entrances.json') as f:
        entrances_data = json.load(f)
    
    graph = WeightedGraph()
    graph.build(nodes_data, edges_data, entrances_data)
    
    print(f"✅ Loaded graph: {len(graph.nodes)} nodes, {sum(len(v) for v in graph.adjacency_list.values()) // 2} edges")
    print(f"✅ Entrances: {[e.name for e in graph.entrances]}")
    
    return graph


def draw_path_on_image(floor_image_path: Path, path_nodes: List[GraphNode], output_path: Path):
    """Draw path on floor plan image and save"""
    # Image dimensions and extent
    WIDTH = 1369
    HEIGHT = 1560
    # Extent: x: 0 to 1369, y: -1560 to 0
    
    # Load image
    img = Image.open(floor_image_path)
    draw = ImageDraw.Draw(img)
    
    print(f"\n📊 Drawing path with {len(path_nodes)} nodes")
    
    # Convert graph coordinates to image coordinates
    def graph_to_image(x: float, y: float) -> Tuple[int, int]:
        """Convert graph coordinates to image pixel coordinates"""
        # Graph: x: 0-1369, y: -1560 to 0
        # Image: x: 0-1369, y: 0-1560 (top-left origin)
        img_x = int(x)
        img_y = int(-y)  # Flip Y axis
        return (img_x, img_y)
    
    # Draw path lines
    for i in range(len(path_nodes) - 1):
        node1 = path_nodes[i]
        node2 = path_nodes[i + 1]
        
        p1 = graph_to_image(node1.x, node1.y)
        p2 = graph_to_image(node2.x, node2.y)
        
        # Draw blue dashed line (approximate with segments)
        draw.line([p1, p2], fill='blue', width=4)
        
        print(f"  Line {i}: ({node1.x:.1f}, {node1.y:.1f}) -> ({node2.x:.1f}, {node2.y:.1f})")
        print(f"           Image: {p1} -> {p2}")
    
    # Draw nodes
    for i, node in enumerate(path_nodes):
        pos = graph_to_image(node.x, node.y)
        radius = 8
        
        if i == 0:
            # Start - Green
            color = 'green'
            label = 'START'
        elif i == len(path_nodes) - 1:
            # End - Red
            color = 'red'
            label = f'ROOM {node.room_num}' if node.room_num else 'END'
        else:
            # Middle - Blue
            color = 'blue'
            label = None
        
        # Draw circle
        bbox = [pos[0] - radius, pos[1] - radius, pos[0] + radius, pos[1] + radius]
        draw.ellipse(bbox, fill=color, outline='white', width=2)
        
        # Draw label
        if label:
            text_pos = (pos[0], pos[1] - 20)
            draw.text(text_pos, label, fill=color, anchor='mm')
    
    # Save
    img.save(output_path)
    print(f"\n✅ Saved annotated image to: {output_path}")


def main():
    # Configuration
    BUILDING_ID = 'ucsb-library'
    TARGET_ROOM = 2312  # Change this to test different rooms
    FLOOR = 2  # Floor where room 2312 is located
    
    print(f"🔍 Testing pathfinding to room {TARGET_ROOM}\n")
    
    # Load graph
    graph = load_graph(BUILDING_ID)
    
    # A. Determine start and end nodes
    print(f"\n📍 Step A: Determine start and end nodes")
    print(f"   Target room: {TARGET_ROOM}")
    
    # Use first entrance (or you can test finding nearest)
    entrance = graph.entrances[0]
    print(f"   Using entrance: {entrance.name} (node {entrance.node})")
    
    # Find room nodes
    room_nodes = graph.find_nodes_by_room(TARGET_ROOM)
    print(f"   Found {len(room_nodes)} node(s) for room {TARGET_ROOM}:")
    for rn in room_nodes:
        print(f"     - Node {rn.id}: floor {rn.floor}, pos ({rn.x:.1f}, {rn.y:.1f})")
    
    # B. Find path from start to end
    print(f"\n🛤️  Step B: Find path using Dijkstra")
    path_nodes = graph.find_path_to_room(TARGET_ROOM, entrance)
    
    if not path_nodes:
        print("❌ Failed to find path")
        return
    
    print(f"✅ Path found: {len(path_nodes)} nodes")
    print(f"   Start: Node {path_nodes[0].id} at ({path_nodes[0].x:.1f}, {path_nodes[0].y:.1f})")
    print(f"   End:   Node {path_nodes[-1].id} at ({path_nodes[-1].x:.1f}, {path_nodes[-1].y:.1f})")
    
    # Filter to current floor
    floor_path = [n for n in path_nodes if n.floor == FLOOR]
    print(f"\n   Nodes on floor {FLOOR}: {len(floor_path)}")
    
    # C. Draw path on image
    print(f"\n🎨 Step C: Draw path on floor plan")
    floor_image = Path(__file__).parent.parent / 'public' / 'floorplans' / BUILDING_ID / f'{FLOOR}.png'
    
    if not floor_image.exists():
        print(f"❌ Floor plan not found: {floor_image}")
        return
    
    output_dir = Path(__file__).parent
    output_path = output_dir / f'path_floor_{FLOOR}_room_{TARGET_ROOM}.png'
    
    draw_path_on_image(floor_image, floor_path, output_path)
    
    print("\n" + "="*60)
    print("✅ Debug test complete!")
    print(f"   View the annotated image: {output_path}")
    print("="*60)


if __name__ == '__main__':
    main()
