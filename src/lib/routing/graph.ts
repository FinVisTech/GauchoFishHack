import type { GraphNode, GraphEdge, Entrance } from '@/lib/data';

/**
 * Weighted graph for indoor routing using adjacency list representation
 */
export class WeightedGraph {
    private adjacencyList: Map<number, Array<{ nodeId: number; weight: number; floor: number | null }>>;
    private nodes: Map<number, GraphNode>;
    private entrances: Entrance[];

    constructor() {
        this.adjacencyList = new Map();
        this.nodes = new Map();
        this.entrances = [];
    }

    /**
     * Build graph from nodes and edges data
     */
    build(nodes: GraphNode[], edges: GraphEdge[], entrances: Entrance[]): void {
        // Store nodes
        for (const node of nodes) {
            this.nodes.set(node.id, node);
            this.adjacencyList.set(node.id, []);
        }

        // Build adjacency list (undirected graph)
        for (const edge of edges) {
            const { from_id, to_id, weight, floor } = edge;
            
            // Add edge in both directions (undirected)
            this.adjacencyList.get(from_id)?.push({ nodeId: to_id, weight, floor });
            this.adjacencyList.get(to_id)?.push({ nodeId: from_id, weight, floor });
        }

        // Store entrances
        this.entrances = entrances;
    }

    /**
     * Get node by ID
     */
    getNode(nodeId: number): GraphNode | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * Get all nodes
     */
    getAllNodes(): GraphNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Get neighbors of a node
     */
    getNeighbors(nodeId: number): Array<{ nodeId: number; weight: number; floor: number | null }> {
        return this.adjacencyList.get(nodeId) || [];
    }

    /**
     * Get all entrances
     */
    getEntrances(): Entrance[] {
        return this.entrances;
    }

    /**
     * Find entrance closest to a GPS coordinate
     */
    findNearestEntrance(lat: number, lng: number): Entrance | null {
        if (this.entrances.length === 0) return null;

        let nearest = this.entrances[0];
        let minDist = this.haversineDistance(lat, lng, nearest.lat, nearest.lng);

        for (const entrance of this.entrances) {
            const dist = this.haversineDistance(lat, lng, entrance.lat, entrance.lng);
            if (dist < minDist) {
                minDist = dist;
                nearest = entrance;
            }
        }

        return nearest;
    }

    /**
     * Find nodes by room number
     */
    findNodesByRoom(roomNum: number): GraphNode[] {
        return Array.from(this.nodes.values()).filter(node => node.room_num === roomNum);
    }

    /**
     * Find nodes by floor
     */
    findNodesByFloor(floor: number): GraphNode[] {
        return Array.from(this.nodes.values()).filter(node => node.floor === floor);
    }

    /**
     * Dijkstra's shortest path algorithm
     * Returns path as array of node IDs, or null if no path exists
     */
    dijkstra(startNodeId: number, endNodeId: number): number[] | null {
        if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
            return null;
        }

        const distances = new Map<number, number>();
        const previous = new Map<number, number | null>();
        const unvisited = new Set<number>();

        // Initialize
        for (const nodeId of this.nodes.keys()) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
            unvisited.add(nodeId);
        }
        distances.set(startNodeId, 0);

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current: number | null = null;
            let minDist = Infinity;
            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId)!;
                if (dist < minDist) {
                    minDist = dist;
                    current = nodeId;
                }
            }

            if (current === null || minDist === Infinity) {
                break; // No path exists
            }

            unvisited.delete(current);

            // Found the target
            if (current === endNodeId) {
                break;
            }

            // Update neighbors
            const neighbors = this.getNeighbors(current);
            for (const { nodeId: neighbor, weight } of neighbors) {
                if (!unvisited.has(neighbor)) continue;

                const alt = distances.get(current)! + weight;
                if (alt < distances.get(neighbor)!) {
                    distances.set(neighbor, alt);
                    previous.set(neighbor, current);
                }
            }
        }

        // Reconstruct path
        if (distances.get(endNodeId) === Infinity) {
            return null; // No path found
        }

        const path: number[] = [];
        let current: number | null = endNodeId;
        while (current !== null) {
            path.unshift(current);
            current = previous.get(current)!;
        }

        return path;
    }

    /**
     * Find shortest path to a room number from an entrance
     * Returns path as array of GraphNodes
     */
    findPathToRoom(roomNum: number, fromEntrance?: Entrance): { path: GraphNode[]; entrance: Entrance } | null {
        const roomNodes = this.findNodesByRoom(roomNum);
        if (roomNodes.length === 0) return null;

        // Use specified entrance or find nearest to building
        const entrance = fromEntrance || this.entrances[0];
        if (!entrance) return null;

        const startNodeId = entrance.node;

        // Try to find path to each room node (there might be multiple nodes for one room)
        let shortestPath: number[] | null = null;
        let shortestLength = Infinity;

        for (const roomNode of roomNodes) {
            const path = this.dijkstra(startNodeId, roomNode.id);
            if (path && path.length < shortestLength) {
                shortestPath = path;
                shortestLength = path.length;
            }
        }

        if (!shortestPath) return null;

        // Convert node IDs to GraphNode objects
        const pathNodes = shortestPath
            .map(id => this.getNode(id))
            .filter((node): node is GraphNode => node !== undefined);

        return { path: pathNodes, entrance };
    }

    /**
     * Haversine distance calculation (in meters)
     */
    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}

/**
 * Load and build graph for a building
 */
export async function loadBuildingGraph(buildingId: string): Promise<WeightedGraph | null> {
    try {
        // Dynamically import the data
        const nodesModule = await import(`@/data/${buildingId}/nodes.json`);
        const edgesModule = await import(`@/data/${buildingId}/edges.json`);
        const entrancesModule = await import(`@/data/${buildingId}/entrances.json`);

        const nodes = nodesModule.default as GraphNode[];
        const edges = edgesModule.default as GraphEdge[];
        const entrances = entrancesModule.default as Entrance[];

        const graph = new WeightedGraph();
        graph.build(nodes, edges, entrances);

        return graph;
    } catch (error) {
        console.error(`Failed to load graph for ${buildingId}:`, error);
        return null;
    }
}
