import { getBuildingById, getAvailableFloors, getFloorplan } from '@/lib/data';
import BuildingClient from '@/components/BuildingClient';
import { notFound } from 'next/navigation';

export default async function Page({ 
    params,
    searchParams 
}: { 
    params: Promise<{ buildingId: string }>;
    searchParams: Promise<{ room?: string }>;
}) {
    const { buildingId } = await params;
    const { room } = await searchParams;
    const building = getBuildingById(buildingId);

    if (!building) {
        notFound();
    }

    const availableFloors = getAvailableFloors(buildingId);
    const floors = availableFloors.map(f => ({
        floor: f,
        data: getFloorplan(buildingId, f)
    }));

    const targetRoom = room ? parseInt(room) : undefined;

    return <BuildingClient building={building} floors={floors} targetRoom={targetRoom} />;
}
