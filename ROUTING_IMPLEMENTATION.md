# Indoor Routing System Implementation

## ✅ Completed Phases

### Phase 1: Type Safety & Data Structure
- ✅ Fixed TypeScript types to make graph fields optional
- ✅ Created proper interfaces for `GraphNode`, `GraphEdge`, and `Entrance`
- ✅ Updated `BuildingManifest` type to support optional routing data
- ✅ Removed dependency on `typeof floorplansManifest` (now uses proper `Manifest` type)

### Phase 2: Data Loading (Option A - Pre-convert to JSON)
- ✅ Created `scripts/convertGpkgToJson.py` to convert GPKG files to JSON
- ✅ Converted nodes.gpkg → nodes.json (121 nodes)
- ✅ Converted edges.gpkg → edges.json (153 edges)
- ✅ Updated manifest to reference JSON files instead of GPKG
- ✅ Added `npm run convert-gpkg` script for future conversions

### Phase 3: Graph Construction
- ✅ Created `WeightedGraph` class with adjacency list representation
- ✅ Implemented Dijkstra's shortest path algorithm
- ✅ Added entrance management and nearest entrance finder
- ✅ Room number search functionality
- ✅ Multi-floor support
- ✅ Created `loadBuildingGraph()` function for dynamic loading

## 📁 File Structure

```
src/
├── lib/
│   ├── data/
│   │   └── index.ts              # Updated with graph types
│   └── routing/
│       ├── graph.ts              # Core graph implementation
│       └── examples.ts           # Usage examples
├── data/
│   ├── buildings.json
│   ├── floorplans.manifest.json  # Updated with JSON paths
│   └── ucsb-library/
│       ├── nodes.json            # ✨ NEW - 121 nodes
│       ├── edges.json            # ✨ NEW - 153 edges
│       ├── entrances.json        # 4 entrances
│       ├── nodes.gpkg            # Original (kept for reference)
│       └── edges.gpkg            # Original (kept for reference)
scripts/
└── convertGpkgToJson.py          # ✨ NEW - Conversion utility
```

## 🔧 API Reference

### Type Definitions

```typescript
// Graph node representing a point in the building
type GraphNode = {
    id: number;
    type: number | null;        // Node type (1=connector, 2=room, etc.)
    room_num: number | null;    // Room number if applicable
    floor: number | null;       // Floor level
    connector_id: number | null;// Stair/elevator connector ID
    name: string | null;        // Optional name
    x: number;                  // X coordinate in floor plan
    y: number;                  // Y coordinate in floor plan
};

// Graph edge representing a connection between nodes
type GraphEdge = {
    id: number;
    from_id: number;
    to_id: number;
    weight: number;             // Distance/cost
    floor: number | null;
};

// Building entrance with GPS coordinates
type Entrance = {
    id: number;
    name: string;
    lat: number;
    lng: number;
    node: number;               // Connected graph node ID
};
```

### WeightedGraph Class

```typescript
const graph = new WeightedGraph();

// Build graph from data
graph.build(nodes, edges, entrances);

// Navigation
const path = graph.dijkstra(startNodeId, endNodeId); // Returns node IDs
const result = graph.findPathToRoom(roomNum); // Returns { path, entrance }

// Queries
const node = graph.getNode(nodeId);
const neighbors = graph.getNeighbors(nodeId);
const roomNodes = graph.findNodesByRoom(1312);
const floorNodes = graph.findNodesByFloor(1);
const entrance = graph.findNearestEntrance(lat, lng);
const entrances = graph.getEntrances();
```

### Helper Functions

```typescript
// Check if building has routing data
if (hasRoutingData('ucsb-library')) {
    // Load and use graph
}

// Get routing data file paths
const paths = getRoutingDataPaths('ucsb-library');
// Returns: { nodes: 'path/to/nodes.json', edges: '...', entrances: '...' }

// Load graph for a building
const graph = await loadBuildingGraph('ucsb-library');
```

## 🚀 Usage Examples

### Find Path to a Room

```typescript
import { loadBuildingGraph } from '@/lib/routing/graph';

const graph = await loadBuildingGraph('ucsb-library');
const result = graph.findPathToRoom(1312);

if (result) {
    console.log(`Path from ${result.entrance.name}:`);
    result.path.forEach(node => {
        console.log(`Node ${node.id} - Floor ${node.floor}`);
    });
}
```

### Find Nearest Entrance

```typescript
const graph = await loadBuildingGraph('ucsb-library');
const userLocation = { lat: 34.4138, lng: -119.8455 };
const entrance = graph.findNearestEntrance(userLocation.lat, userLocation.lng);

console.log(`Use ${entrance.name} entrance`);
```

### Custom Path Between Nodes

```typescript
const graph = await loadBuildingGraph('ucsb-library');
const pathNodeIds = graph.dijkstra(startNodeId, endNodeId);

const pathNodes = pathNodeIds.map(id => graph.getNode(id));
// Visualize on floor plan using node.x and node.y coordinates
```

## 📊 Data Statistics

**UCSB Library:**
- 121 graph nodes
- 153 edges (306 connections since undirected)
- 4 entrances
- 8 floors
- Coordinate system: 0-1369 (x), -1560-0 (y)

## 🔄 Adding Routing to New Buildings

1. Create GPKG files with nodes and edges tables
2. Create entrances.json with entrance data
3. Run conversion:
   ```bash
   npm run convert-gpkg
   ```
4. Update `floorplans.manifest.json`:
   ```json
   "building-id": {
     "graphNodes": "building-id/nodes.json",
     "graphEdges": "building-id/edges.json",
     "entrances": "building-id/entrances.json",
     "floors": { ... }
   }
   ```

## 🎯 Next Steps (Phase 4 - Integration)

When ready to integrate:

1. **Load graph at building view**
   - Call `loadBuildingGraph()` when opening indoor map
   - Cache graph instance for performance

2. **Room search enhancement**
   - Use `findNodesByRoom()` to validate room exists
   - Highlight room on floor plan using node coordinates

3. **Path visualization**
   - Convert path nodes to SVG/Canvas overlay
   - Draw lines between node coordinates
   - Show turn-by-turn directions

4. **Multi-floor routing**
   - Detect floor changes in path
   - Show stair/elevator transitions
   - Switch floor view automatically

5. **Live navigation**
   - Use user GPS + nearest entrance
   - Calculate path from entrance to destination
   - Update as user moves

## 📝 Notes

- Graph is **undirected** (bidirectional edges)
- Weights represent **distance** in floor plan coordinates
- Node types: 1=connector, 2=room (check `type` field)
- Connector nodes link floors (stairs/elevators)
- Coordinate system matches floor plan PNG dimensions
