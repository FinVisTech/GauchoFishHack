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

    return (
        <div className="h-screen w-screen relative overflow-hidden">
            <CampusMap initialQuery={query} initialBuildingId={buildingId} />
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
