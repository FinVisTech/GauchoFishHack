'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { resolveBuilding, type Building } from '@/lib/data';

interface ParsedClass {
    original: string;
    building: Building;
    room: string;
}

export default function SchedulePage() {
    const [input, setInput] = useState('');
    const [parsed, setParsed] = useState<ParsedClass[]>([]);

    const parseSchedule = () => {
        const lines = input.split('\n');
        const results: ParsedClass[] = [];

        // Simple regex for "Building Room" pattern
        // e.g. "PHELP 3526", "GIRV 1004" (GIRV unknown but handled)
        // We rely on resolveBuilding to check if we support it.

        // Pattern: 2+ chars (Abbr) + space + 3-5 chars (Room)
        const regex = /([A-Za-z]{2,})\s+(\d{3,4}[A-Za-z]?)/g;

        lines.forEach(line => {
            let match;
            while ((match = regex.exec(line)) !== null) {
                const full = match[0];
                const abbr = match[1];
                const room = match[2];

                // Try to resolve building
                const building = resolveBuilding(abbr);
                if (building) {
                    // check duplicates
                    if (!results.find(r => r.original === full)) {
                        results.push({ original: full, building, room });
                    }
                }
            }
        });

        setParsed(results);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold">Import Schedule</h1>
                </header>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 space-y-4">
                    <p className="text-slate-500">Paste your class list or schedule email here. We'll find the rooms.</p>
                    <textarea
                        className="w-full h-40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                        placeholder={"PHELP 3526\nILP 1201\nCHEM 1179..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <button
                        onClick={parseSchedule}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                    >
                        Find Classrooms
                    </button>
                </div>

                {parsed.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="font-semibold text-slate-500 uppercase tracking-wider text-sm">Found {parsed.length} Classes</h2>
                        {parsed.map((item, i) => (
                            <Link
                                key={i}
                                href={`/map?b=${item.building.id}&r=${item.room}`}
                                className="block bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-lg group-hover:text-blue-600 transition-colors">
                                            {item.original}
                                        </div>
                                        <div className="text-slate-500 text-sm">
                                            {item.building.name} • Room {item.room}
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {parsed.length === 0 && input.length > 10 && (
                    <div className="text-center text-slate-400 text-sm">
                        No supported buildings found. Try "PHELP 3526".
                    </div>
                )}
            </div>
        </div>
    );
}
