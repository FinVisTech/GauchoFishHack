/**
 * Example usage of the graph routing system
 * 
 * This demonstrates how to:
 * 1. Get graphs from the registry (pre-loaded at bootstrap)
 * 2. Find paths to rooms
 * 3. Use entrances
 * 4. Navigate between nodes
 */

import { getGraph } from '@/lib/data';
import type { GraphNode } from '@/lib/data';

// Example: Find path to a room
export function findPathToRoomExample() {
    const graph = getGraph('ucsb-library');
    
    if (!graph) {
        console.error('Graph not available for ucsb-library');
        return;
    }

    // Find path to room 1312
    const result = graph.findPathToRoom(1312);
    
    if (result) {
        console.log(`Path to room 1312 from ${result.entrance.name}:`);
        console.log(`Total nodes: ${result.path.length}`);
        result.path.forEach((node, i) => {
            console.log(`  ${i + 1}. Node ${node.id} - Floor ${node.floor} ${node.room_num ? `Room ${node.room_num}` : ''}`);
        });
    } else {
        console.log('No path found to room 1312');
    }
}

// Example: Find nearest entrance from user location
export function findNearestEntranceExample(userLat: number, userLng: number) {
    const graph = getGraph('ucsb-library');
    
    if (!graph) {
        console.error('Graph not available for ucsb-library');
        return;
    }

    const entrance = graph.findNearestEntrance(userLat, userLng);
    
    if (entrance) {
        console.log(`Nearest entrance: ${entrance.name}`);
        console.log(`  Location: ${entrance.lat}, ${entrance.lng}`);
        console.log(`  Node: ${entrance.node}`);
    }
}

// Example: Get all nodes on a specific floor
export function getFloorNodesExample(floor: number) {
    const graph = getGraph('ucsb-library');
    
    if (!graph) {
        console.error('Graph not available for ucsb-library');
        return;
    }

    const nodes = graph.findNodesByFloor(floor);
    console.log(`Found ${nodes.length} nodes on floor ${floor}`);
    
    // Group by type
    const byType = nodes.reduce((acc, node) => {
        const type = node.type || 0;
        if (!acc[type]) acc[type] = [];
        acc[type].push(node);
        return acc;
    }, {} as Record<number, GraphNode[]>);

    console.log('Nodes by type:', Object.keys(byType).map(type => 
        `Type ${type}: ${byType[parseInt(type)].length} nodes`
    ));
}

// Example: Find path between two specific nodes
export function findPathBetweenNodesExample(startNodeId: number, endNodeId: number) {
    const graph = getGraph('ucsb-library');
    
    if (!graph) {
        console.error('Graph not available for ucsb-library');
        return;
    }

    const pathIds = graph.dijkstra(startNodeId, endNodeId);
    
    if (pathIds) {
        console.log(`Path from node ${startNodeId} to node ${endNodeId}:`);
        const pathNodes = pathIds.map(id => graph.getNode(id)).filter(Boolean);
        
        pathNodes.forEach((node, i) => {
            if (!node) return;
            console.log(`  ${i + 1}. Node ${node.id} at (${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
        });
        
        return pathNodes;
    } else {
        console.log('No path found');
        return null;
    }
}
