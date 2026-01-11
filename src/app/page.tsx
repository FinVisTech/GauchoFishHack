'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Clock, ChevronRight, Upload, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import LandingHero from '@/components/LandingHero';
import { type Building } from '@/lib/data';

interface ParsedClass {
    original: string;
    building: Building;
    room: string;
    time?: string;
    course?: string;
    days?: string;
    startTime?: string;
    endTime?: string;
    type?: 'Lecture' | 'Section';
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  
  // Upload State
  const [parsed, setParsed] = useState<ParsedClass[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Helper to calculate duration and type
  const getClassType = (start?: string, end?: string): 'Lecture' | 'Section' | undefined => {
      if (!start || !end) return undefined;
      try {
          const [startH, startM] = start.split(':').map(Number);
          const [endH, endM] = end.split(':').map(Number);
          const startMins = startH * 60 + startM;
          const endMins = endH * 60 + endM;
          const duration = endMins - startMins;
          
          // Heuristic: Classes <= 65 mins are usually Sections (50m + buffer)
          // Classes > 65 mins are usually Lectures (75m, 110m, etc)
          return duration <= 65 ? 'Section' : 'Lecture';
      } catch (e) {
          return undefined;
      }
  };

  useEffect(() => {
    // Request location access on page load
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            () => {
                console.log("Location access granted.");
            },
            (error) => {
                console.error("Location access denied or error:", error);
            }
        );
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecents(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Save to recents
    const newRecents = [query, ...recents.filter(r => r !== query)].slice(0, 5);
    setRecents(newRecents);
    localStorage.setItem('recent_searches', JSON.stringify(newRecents));

    router.push(`/map?q=${encodeURIComponent(query)}`);
  };

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
                    endTime: c.endTime,
                    type: getClassType(c.startTime, c.endTime)
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xl space-y-8">
        <LandingHero />

        {/* AI Upload Section */}
        <div className="rounded-2xl p-6 text-black bg-white border border-gray-200 shadow-md overflow-hidden relative">
            <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-black">
                    <ImageIcon className="h-5 w-5" />
                    Screenshot Import (AI)
                </h2>
                <p className="mb-6 text-sm max-w-sm text-black">
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
                    className="relative btn-apple-primary px-6 py-4 rounded-full font-semibold transition-all flex items-center gap-3 disabled:opacity-90 disabled:cursor-wait w-full justify-center overflow-hidden group h-16"
                >
                    {/* Progress Fill Layer */}
                    <div 
                        className={`absolute bottom-0 left-0 right-0 bg-[#0A84FF] transition-all duration-300 ease-out z-0 ${isAnalyzing ? 'opacity-100' : 'opacity-0'}`}
                        style={{ height: isAnalyzing ? `${uploadProgress}%` : '0%' }}
                    >
                        {/* Wave Animation Layer */}
                        <div className="absolute top-0 left-0 w-[200%] h-8 -mt-4 animate-wave opacity-50 bg-white rounded-[40%]"></div>
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-10 flex items-center gap-3 transition-colors duration-200 text-black">
                        {isAnalyzing ? (
                            <span className={`flex items-center gap-2 text-white`}>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-lg">Analyzing... {uploadProgress}%</span>
                            </span>
                        ) : (
                            <>
                                <Upload className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                <span className="text-lg text-black">Upload Schedule Screenshot</span>
                            </>
                        )}
                    </div>
                </button>

                {isAnalyzing && (
                    <p className="mt-3 text-sm text-black animate-pulse text-center">
                        File uploaded. AI is finding your classrooms...
                    </p>
                )}

                {uploadSuccess && (
                    <div className="mt-4 bg-green-100 border border-green-200 text-black px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-green-500 rounded-full p-1">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-sm">Upload Complete!</p>
                            <p className="text-xs opacity-90 text-black">Found {parsed.length} classes with locations.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Parsed Results */}
        {parsed.length > 0 && (
            <div className="space-y-3">
                <h2 className="font-semibold text-black uppercase tracking-wider text-sm">Found {parsed.length} Classes</h2>
                {parsed.map((item, i) => (
                    <Link
                        key={i}
                        href={`/map?b=${item.building.id}&r=${item.room}`}
                        className="block bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="font-bold text-lg text-black group-hover:text-blue-600 transition-colors">
                                        {item.course || "Unknown Course"}
                                    </div>
                                    {item.type && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                            item.type === 'Lecture' 
                                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' 
                                                : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                                        }`}>
                                            {item.type}
                                        </span>
                                    )}
                                    {item.days && (
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                            {item.days}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-black">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-black" />
                                        <span className="font-medium text-black">
                                            {item.building.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 flex items-center justify-center text-xs font-bold bg-gray-100 rounded text-black">#</div>
                                        <span>Room {item.room}</span>
                                    </div>
                                    {(item.startTime || item.time) && (
                                        <div className="col-span-2 flex items-center gap-1.5 mt-1 text-black">
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

        <Link
            href={parsed.length > 0 ? `/map?schedule=${encodeURIComponent(JSON.stringify(parsed.map(p => ({
                course: p.course,
                room: p.room,
                time: p.time,
                type: p.type,
                building: {
                    id: p.building.id,
                    name: p.building.name,
                    location: p.building.location,
                    color: p.building.color
                }
            }))))}` : "/map"}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group h-16"
        >
            <MapPin className="h-6 w-6 text-[#0A84FF] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-black">{parsed.length > 0 ? 'View All Classes on Map' : 'Browse Map'}</span>
        </Link>

        {recents.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-semibold text-black uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Searches
            </h2>
            <div className="space-y-2">
              {recents.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/map?q=${encodeURIComponent(recent)}`)}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="font-medium text-black">{recent}</span>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}