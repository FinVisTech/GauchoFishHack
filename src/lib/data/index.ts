import buildingsData from '@/data/buildings.json';
import floorplansManifest from '@/data/floorplans.manifest.json';

export type Building = {
    id: string;
    name: string;
    abbr: string[];
    location: { lat: number; lng: number };
    color: string;
};

// Graph node types
export type GraphNode = {
    id: number;
    type: number | null;
    room_num: number | null;
    floor: number | null;
    connector_id: number | null;
    name: string | null;
    x: number;
    y: number;
};

// Graph edge types
export type GraphEdge = {
    id: number;
    from_id: number;
    to_id: number;
    weight: number;
    floor: number | null;
};

// Entrance types
export type Entrance = {
    id: number;
    name: string;
    lat: number;
    lng: number;
    node: number;
};

// Building manifest with optional routing data
export type BuildingManifest = {
    sourceZip?: string;
    graphNodes?: string;
    graphEdges?: string;
    entrances?: string;
    floors: {
        [floor: string]: {
            path: string;
            w: number;
            h: number;
        };
    };
    skipped?: string[];
};

export type Manifest = {
    [buildingId: string]: BuildingManifest;
};

export function getBuildings(): Building[] {
    return buildingsData as Building[];
}

export function getBuildingById(id: string): Building | undefined {
    return getBuildings().find((b) => b.id === id);
}

export function resolveBuilding(query: string): Building | undefined {
    if (!query) return undefined;
    const q = query.toUpperCase().trim();

    return getBuildings().find((b) => {
        // Check ID
        if (b.id.toUpperCase() === q) return true;
        // Check name
        if (b.name.toUpperCase().includes(q)) return true;
        // Check abbrs
        if (b.abbr.some((a) => q === a || q.startsWith(a + ' '))) return true;
        return false;
    });
}

export function getAvailableFloors(buildingId: string): string[] {
    const bData = (floorplansManifest as Manifest)[buildingId];
    if (!bData || !bData.floors) return [];
    // Sort numerically if possible
    return Object.keys(bData.floors).sort((a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
    });
}

export function getFloorplan(buildingId: string, floor: string) {
    const bData = (floorplansManifest as Manifest)[buildingId];
    if (!bData || !bData.floors) return null;
    return bData.floors[floor] || null;
}

// Check if a building has routing data
export function hasRoutingData(buildingId: string): boolean {
    const bData = (floorplansManifest as Manifest)[buildingId];
    return !!(bData?.graphNodes && bData?.graphEdges && bData?.entrances);
}

// Get routing data paths for a building
export function getRoutingDataPaths(buildingId: string): {
    nodes: string | null;
    edges: string | null;
    entrances: string | null;
} {
    const bData = (floorplansManifest as Manifest)[buildingId];
    if (!bData) return { nodes: null, edges: null, entrances: null };
    
    return {
        nodes: bData.graphNodes || null,
        edges: bData.graphEdges || null,
        entrances: bData.entrances || null
    };
}

// Re-export graph registry functions for convenience
export { getGraph, hasGraph, getAvailableGraphs, getGraphStats } from '@/lib/routing/registry';
