import buildingsData from '@/data/buildings.json';
import floorplansManifest from '@/data/floorplans.manifest.json';

export type Building = {
    id: string;
    name: string;
    abbr: string[];
    location: { lat: number; lng: number };
    color: string;
};

export type Manifest = typeof floorplansManifest;

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
    const bData = (floorplansManifest as any)[buildingId];
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
    const bData = (floorplansManifest as any)[buildingId];
    if (!bData || !bData.floors) return null;
    return bData.floors[floor] || null;
}
