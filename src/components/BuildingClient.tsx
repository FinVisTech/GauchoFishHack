'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Search } from 'lucide-react';
import IndoorViewer from '@/components/IndoorViewer';
import type { Building } from '@/lib/data';

interface FloorInfo {
    floor: string;
    data: { path: string; w: number; h: number } | null;
}

interface BuildingClientProps {
    building: Building;
    floors: FloorInfo[];
}

export default function BuildingClient({ building, floors }: BuildingClientProps) {
    const [currentFloor, setCurrentFloor] = useState(floors[0]?.floor || '1');
    const [roomQuery, setRoomQuery] = useState('');

    const currentFloorData = floors.find(f => f.floor === currentFloor)?.data;

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
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Floor data unavailble
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
