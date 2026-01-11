'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// Lazy load map to avoid SSR issues with Mapbox GL
const CampusMap = dynamic(() => import('@/components/CampusMap'), {
    ssr: false,
    loading: () => <div className="h-screen w-full bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center">Loading Campus Map...</div>
});

function MapContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const buildingId = searchParams.get('b');
    
    // Parse "schedule" parameter if it exists (base64 JSON string)
    const scheduleParam = searchParams.get('schedule');
    let parsedClasses = [];
    if (scheduleParam) {
        try {
            parsedClasses = JSON.parse(decodeURIComponent(scheduleParam));
        } catch (e) {
            console.error("Failed to parse schedule param", e);
        }
    }

    return (
        <div className="h-[100dvh] w-screen relative overflow-hidden">
            <CampusMap initialQuery={query} initialBuildingId={buildingId} parsedClasses={parsedClasses} />
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MapContent />
        </Suspense>
    );
}
