'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Search, ChevronDown } from 'lucide-react';
import IndoorViewer from '@/components/IndoorViewer';
import { getGraph, type Building, type GraphNode } from '@/lib/data';

interface FloorInfo {
    floor: string;
    data: { path: string; w: number; h: number } | null;
}

interface BuildingClientProps {
    building: Building;
    floors: FloorInfo[];
    targetRoom?: number;
}

export default function BuildingClient({ building, floors, targetRoom }: BuildingClientProps) {
    const [currentFloor, setCurrentFloor] = useState('1');
    const [roomQuery, setRoomQuery] = useState('');
    const [pathData, setPathData] = useState<Record<number, GraphNode[]>>({});
    const [fullPath, setFullPath] = useState<GraphNode[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [availableRooms, setAvailableRooms] = useState<number[]>([]);
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(targetRoom || null);

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.warn('Could not get user location:', error);
                }
            );
        }
    }, []);

    // Load available rooms from graph if not already targeting a room
    useEffect(() => {
        if (targetRoom) return; // Skip if we already have a target room
        
        const graph = getGraph(building.id);
        if (!graph) return;

        // Get all unique room numbers
        const rooms = Array.from(
            new Set(
                graph.getAllNodes()
                    .filter(node => node.room_num !== null)
                    .map(node => node.room_num)
            )
        ).sort((a, b) => (a || 0) - (b || 0));

        setAvailableRooms(rooms as number[]);
        console.log(`📋 Available rooms in ${building.name}: ${rooms.length} rooms`);
    }, [building.id, targetRoom]);

    // Calculate path when targetRoom and userLocation are available
    useEffect(() => {
        const roomToUse = selectedRoom || targetRoom;
        if (!roomToUse) return;
        
        console.log('🔍 BuildingClient: Calculating path for room', roomToUse);
        
        const graph = getGraph(building.id);
        if (!graph) {
            console.warn(`No graph data available for ${building.id}`);
            return;
        }

        // Find nearest entrance (or use first if no user location)
        let entrance;
        if (userLocation) {
            entrance = graph.findNearestEntrance(userLocation[0], userLocation[1]);
            console.log('📍 Using nearest entrance:', entrance?.name);
        } else {
            const entrances = graph.getEntrances();
            entrance = entrances[0];
            console.log('📍 Using first entrance (no user location):', entrance?.name);
        }

        if (!entrance) {
            console.error('No entrance found');
            return;
        }

        // Find path to target room
        const result = graph.findPathToRoom(roomToUse, entrance);
        
        if (!result) {
            console.warn(`No path found to room ${roomToUse}`);
            return;
        }

        console.log(`✅ Path found: ${result.path.length} nodes from ${entrance.name}`);

        // Store full path for labeling
        setFullPath(result.path);

        // Group path nodes by floor
        const pathByFloor: Record<number, GraphNode[]> = {};
        for (const node of result.path) {
            if (node.floor !== null) {
                if (!pathByFloor[node.floor]) {
                    pathByFloor[node.floor] = [];
                }
                pathByFloor[node.floor].push(node);
            }
        }

        console.log('📊 Path by floor:', Object.keys(pathByFloor).map(f => `Floor ${f}: ${pathByFloor[parseInt(f)].length} nodes`));

        setPathData(pathByFloor);
        
        // Auto-switch to the floor where the target room is located
        const targetNode = result.path[result.path.length - 1];
        if (targetNode.floor !== null) {
            console.log(`🔄 Switching to floor ${targetNode.floor}`);
            setCurrentFloor(targetNode.floor.toString());
        }

        console.log(`✅ Path calculated: ${result.path.length} nodes, from ${entrance.name}`);
    }, [selectedRoom, targetRoom, building.id, userLocation]);

    const currentFloorData = floors.find(f => f.floor === currentFloor)?.data;
    const currentFloorPath = pathData[parseInt(currentFloor)] || [];

    // Debug logging for current floor path
    useEffect(() => {
        console.log(`🗺️  Current floor: ${currentFloor}`);
        console.log(`   Floor path nodes: ${currentFloorPath.length}`);
        if (currentFloorPath.length > 0) {
            console.log('   First:', currentFloorPath[0]);
            console.log('   Last:', currentFloorPath[currentFloorPath.length - 1]);
        }
    }, [currentFloor, currentFloorPath]);

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
            {/* Header */}
            <header className="flex-none h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/map" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{building.name}</h1>
                        <p className="text-xs text-slate-500">Floor {currentFloor}</p>
                    </div>
                </div>

                {/* Floor Switcher (Mobile/Desktop) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-[200px] scrollbar-hide">
                    {floors.map(f => (
                        <button
                            key={f.floor}
                            onClick={() => setCurrentFloor(f.floor)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${currentFloor === f.floor
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {f.floor}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">

                {/* Sidebar (Desktop) / Bottom Sheet (Mobile) - MVP simplified to sidebar on large, overlay on small? 
            For now, just a Floating Search on top of map.
        */}
                <div className="absolute top-4 left-4 z-20 w-64 hidden md:block space-y-2">
                    <div className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Find Room</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                value={roomQuery}
                                onChange={e => setRoomQuery(e.target.value)}
                                placeholder="e.g. 2304"
                                className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-800 rounded border-none text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        {roomQuery && (
                            <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                Targeting rooms is coming soon. Look for {roomQuery} on the floorplan.
                            </div>
                        )}
                    </div>
                </div>

                {/* Viewer */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative">
                    {currentFloorData ? (
                        <IndoorViewer
                            src={currentFloorData.path}
                            width={currentFloorData.w}
                            height={currentFloorData.h}
                            pathNodes={currentFloorPath}
                            fullPath={fullPath}
                            currentFloor={parseInt(currentFloor)}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Floor data unavailble
                        </div>
                    )}

                    {/* Room picker dropdown (right side) */}
                    {!targetRoom && availableRooms.length > 0 && (
                        <div className="absolute top-4 right-4 z-20 w-64">
                            <div className="bg-white dark:bg-slate-900 shadow-lg rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Dropdown header */}
                                <button
                                    onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {selectedRoom ? `Room ${selectedRoom}` : 'Select a room'}
                                        </span>
                                    </div>
                                    <ChevronDown 
                                        className={`h-4 w-4 text-slate-400 transition-transform ${showRoomDropdown ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Dropdown content */}
                                {showRoomDropdown && (
                                    <div className="border-t border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                                        {availableRooms.map((room) => (
                                            <button
                                                key={room}
                                                onClick={() => {
                                                    setSelectedRoom(room);
                                                    setShowRoomDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                                                    selectedRoom === room
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                Room {room}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
