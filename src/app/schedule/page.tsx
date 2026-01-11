'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { resolveBuilding, type Building } from '@/lib/data';

interface ParsedClass {
    original: string;
    building: Building;
    room: string;
    time?: string;
    course?: string;
    days?: string;
    startTime?: string;
    endTime?: string;
}

export default function SchedulePage() {
    const [input, setInput] = useState('');
    const [parsed, setParsed] = useState<ParsedClass[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setUploadSuccess(false);
        setUploadProgress(0);
        setParsed([]); // Clear previous results
        
        // Simulate progress for UX
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev; // Hold at 90%
                return prev + 10;
            });
        }, 500);

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = async () => {
                const base64 = reader.result;
                
                // Immediately jump to 40% after file read
                setUploadProgress(40);
                
                const res = await fetch('/api/parse-schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to analyze');
                }

                const data = await res.json();
                
                clearInterval(progressInterval);
                setUploadProgress(100);

                // Transform API response to ParsedClass format
                const newParsed: ParsedClass[] = data.classes
                    .filter((c: any) => c.buildingDetails) // Only keep resolved buildings
                    .map((c: any) => ({
                        original: `${c.course}: ${c.location}`,
                        building: c.buildingDetails,
                        room: c.room,
                        time: c.time || (c.startTime && c.endTime ? `${c.startTime} - ${c.endTime}` : undefined),
                        course: c.course,
                        days: c.days,
                        startTime: c.startTime,
                        endTime: c.endTime
                    }));

                setParsed(newParsed);
                setUploadSuccess(true);
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setUploadSuccess(false);
                    setUploadProgress(0);
                }, 5000);
            };
        } catch (err: any) {
            console.error(err);
            clearInterval(progressInterval);
            setUploadProgress(0);
            alert(`Failed to analyze schedule: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

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

                {/* AI Upload Section */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Screenshot Import (AI)
                        </h2>
                        <p className="text-blue-100 mb-6 text-sm max-w-sm">
                            Upload a screenshot of your GOLD schedule. Our AI will automatically find your classrooms.
                        </p>
                        
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75 disabled:cursor-wait w-full sm:w-auto justify-center"
                        >
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center w-full">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Analyzing... {Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-blue-100 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5" />
                                    Upload Screenshot
                                </>
                            )}
                        </button>

                        {isAnalyzing && (
                            <p className="mt-3 text-sm text-blue-100 animate-pulse">
                                File uploaded. AI is finding your classrooms...
                            </p>
                        )}

                        {uploadSuccess && (
                            <div className="mt-4 bg-green-500/20 border border-green-500/30 text-green-50 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="bg-green-500 rounded-full p-1">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Upload Complete!</p>
                                    <p className="text-xs opacity-90">Found {parsed.length} classes with locations.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Decorative background circles */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-indigo-400 opacity-20 rounded-full blur-xl"></div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    OR PASTE TEXT
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 space-y-4">
                    <p className="text-slate-500">Paste your class list or schedule email here.</p>
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
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="font-bold text-lg group-hover:text-blue-600 transition-colors">
                                                {item.course || "Unknown Course"}
                                            </div>
                                            {item.days && (
                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {item.days}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {item.building.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 flex items-center justify-center text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded text-slate-500">#</div>
                                                <span>Room {item.room}</span>
                                            </div>
                                            {(item.startTime || item.time) && (
                                                <div className="col-span-2 flex items-center gap-1.5 mt-1 text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>
                                                        {item.startTime && item.endTime 
                                                            ? `${item.startTime} - ${item.endTime}` 
                                                            : item.time}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pl-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    </div>
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
