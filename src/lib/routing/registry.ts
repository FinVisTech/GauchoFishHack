/**
 * Graph Registry - Manages building graphs initialized at bootstrap
 */

import { WeightedGraph } from './graph';
import { getBuildings, hasRoutingData, type GraphNode, type GraphEdge, type Entrance } from '@/lib/data';

// Import graph data for buildings with routing
import ucsbLibraryNodes from '@/data/ucsb-library/nodes.json';
import ucsbLibraryEdges from '@/data/ucsb-library/edges.json';
import ucsbLibraryEntrances from '@/data/ucsb-library/entrances.json';

// Map building IDs to their graph data
const graphDataMap: Record<string, { nodes: GraphNode[]; edges: GraphEdge[]; entrances: Entrance[] }> = {
    'ucsb-library': {
        nodes: ucsbLibraryNodes as GraphNode[],
        edges: ucsbLibraryEdges as GraphEdge[],
        entrances: ucsbLibraryEntrances as Entrance[]
    }
    // Add more buildings here as they get routing data
};

// Cache for initialized graphs
const graphCache = new Map<string, WeightedGraph>();

/**
 * Initialize graphs for all buildings with routing data at bootstrap
 */
function initializeGraphs(): void {
    const buildings = getBuildings();
    
    for (const building of buildings) {
        if (hasRoutingData(building.id) && graphDataMap[building.id]) {
            try {
                const { nodes, edges, entrances } = graphDataMap[building.id];
                const graph = new WeightedGraph();
                graph.build(nodes, edges, entrances);
                graphCache.set(building.id, graph);
                console.log(`✅ Initialized graph for ${building.name} (${building.id})`);
            } catch (error) {
                console.error(`❌ Failed to initialize graph for ${building.id}:`, error);
            }
        }
    }
    
    console.log(`📊 Graph registry initialized with ${graphCache.size} building(s)`);
}

/**
 * Get graph for a building (from cache)
 */
export function getGraph(buildingId: string): WeightedGraph | null {
    return graphCache.get(buildingId) || null;
}

/**
 * Check if a graph is available for a building
 */
export function hasGraph(buildingId: string): boolean {
    return graphCache.has(buildingId);
}

/**
 * Get all building IDs with initialized graphs
 */
export function getAvailableGraphs(): string[] {
    return Array.from(graphCache.keys());
}

/**
 * Get statistics about loaded graphs
 */
export function getGraphStats(): Record<string, { nodes: number; edges: number; entrances: number }> {
    const stats: Record<string, { nodes: number; edges: number; entrances: number }> = {};
    
    for (const [buildingId, graph] of graphCache.entries()) {
        const nodes = graph.getAllNodes();
        const entrances = graph.getEntrances();
        
        // Count edges by summing neighbors (divide by 2 since undirected)
        let edgeCount = 0;
        for (const node of nodes) {
            edgeCount += graph.getNeighbors(node.id).length;
        }
        
        stats[buildingId] = {
            nodes: nodes.length,
            edges: edgeCount / 2,
            entrances: entrances.length
        };
    }
    
    return stats;
}

// Initialize graphs at module load (bootstrap)
if (typeof window === 'undefined') {
    // Server-side initialization
    initializeGraphs();
} else {
    // Client-side initialization
    initializeGraphs();
}

// Export for manual re-initialization if needed
export { initializeGraphs };
