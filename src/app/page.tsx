'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

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

    // Convert spaces to plus for URL if needed, but Next.js router handles params
    // Logic: If query looks like "Building Room", map page handles it.
    router.push(`/map?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Find My <span className="text-blue-600">Classroom</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            UCSB Indoor Navigation & Floorplans
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="e.g. PHELP 3526, ILP 1201"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="h-5 w-5" />
            Navigate
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/schedule"
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <Calendar className="h-6 w-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Paste Schedule</span>
          </Link>
          <Link
            href="/map"
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <MapPin className="h-6 w-6 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Browse Map</span>
          </Link>
        </div>

        {recents.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Searches
            </h2>
            <div className="space-y-2">
              {recents.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/map?q=${encodeURIComponent(recent)}`)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">{recent}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
