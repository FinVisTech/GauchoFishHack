'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { useRouter } from 'next/navigation';
import { Search, Navigation, Map as MapIcon, X, User, Plus, Calendar, ArrowLeft, Menu, MapPin } from 'lucide-react';
import { getBuildings, resolveBuilding, type Building } from '@/lib/data';

interface CampusMapProps {
    initialQuery?: string | null;
    initialBuildingId?: string | null;
    parsedClasses?: any[];
}

const UCSB_CENTER = [-119.845, 34.414];
const INITIAL_ZOOM = 15;
// Bounding box for UCSB/Goleta area to improve search relevance
const UCSB_BBOX = [-119.90, 34.40, -119.80, 34.45];

    export default function CampusMap(props: CampusMapProps) {
        const { initialQuery, initialBuildingId } = props;
        const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const directionsRef = useRef<any>(null);
    const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const classMarkersRef = useRef<mapboxgl.Marker[]>([]); // New ref for class markers
    const [tokenError, setTokenError] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleText, setScheduleText] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const router = useRouter();
    const geoRequestedRef = useRef(false);

    // Re-plot class markers whenever parsedClasses or Map changes
    useEffect(() => {
        const { parsedClasses } = props; // Destructure props inside effect or use props directly consistently
        
        if (!isMapLoaded || !map.current || !parsedClasses || parsedClasses.length === 0) {
            // If no classes, ensure markers are cleared
            classMarkersRef.current.forEach(m => m.remove());
            classMarkersRef.current = [];
            return;
        }

        // Clear existing class markers
        classMarkersRef.current.forEach(m => m.remove());
        classMarkersRef.current = [];

        const bounds = new mapboxgl.LngLatBounds();

        parsedClasses.forEach((cls) => {
            if (cls.building && cls.building.location) {
                // Create custom element for the marker
                const el = document.createElement('div');
                el.className = 'class-marker';
                el.innerHTML = `<div style="
                    background-color: ${cls.building.color || '#3b82f6'};
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    color: white;
                ">${cls.type === 'Section' ? 'S' : 'C'}</div>`;

                // Popup content
                const popupHTML = `
                    <div class="p-2 min-w-[150px]">
                        <div class="font-bold text-sm mb-1">${cls.course || 'Class'}</div>
                        <div class="text-xs text-gray-600 mb-1">
                            ${cls.building.name}<br/>
                            Room ${cls.room}
                        </div>
                        ${cls.time ? `<div class="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block">${cls.time}</div>` : ''}
                        ${cls.type ? `<span class="ml-1 text-[10px] font-bold px-1 py-0.5 rounded uppercase tracking-wider border ${cls.type === 'Lecture' ? 'text-blue-600 border-blue-200' : 'text-purple-600 border-purple-200'}">${cls.type}</span>` : ''}
                    </div>
                `;

                const popup = new mapboxgl.Popup({ offset: 25 })
                    .setHTML(popupHTML);

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([cls.building.location.lng, cls.building.location.lat])
                    .setPopup(popup)
                    .addTo(map.current!);

                classMarkersRef.current.push(marker);
                bounds.extend([cls.building.location.lng, cls.building.location.lat]);
            }
        });

        // Fit map to show all markers
        if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, {
                padding: { top: 100, bottom: 100, left: 100, right: 100 },
                maxZoom: 17
            });
        }

    }, [props.parsedClasses, isMapLoaded]);

    // Resolve initial building
    useEffect(() => {
        if (initialBuildingId) {
            const b = getBuildings().find(b => b.id === initialBuildingId);
            if (b) {
                setSelectedBuilding(b);
                setHasSearched(true);
            }
        } else if (initialQuery) {
            const b = resolveBuilding(initialQuery);
            if (b) {
                setSelectedBuilding(b);
                setHasSearched(true);
            }
        }
    }, [initialBuildingId, initialQuery]);

    // Prompt for geolocation as soon as map component mounts (once per load)
    useEffect(() => {
        if (geoRequestedRef.current) return;
        geoRequestedRef.current = true;
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation([longitude, latitude]);
            },
            (error) => {
                console.warn('Geolocation permission denied or unavailable', error);
            }
        );
    }, []);

    useEffect(() => {
        if (map.current) return;
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (!token) {
            setTokenError(true);
            return;
        }

        mapboxgl.accessToken = token;

        if (!mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: UCSB_CENTER as [number, number],
            zoom: INITIAL_ZOOM,
            attributionControl: false,
        });

        // Expose map to window immediately for debugging/coordinate extraction
        // @ts-ignore
        window.campusMap = map.current;
        console.log('Mapbox instance exposed as window.campusMap');

        // Initialize Directions Plugin
        // controls.inputs: false hides the A/B box as requested
        const directions = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: 'imperial',
            profile: 'mapbox/walking',
            interactive: false,
            controls: {
                inputs: false,
                instructions: false,
                profileSwitcher: false
            }
        });



        map.current.addControl(directions as any, 'top-left');
        directionsRef.current = directions;

        // Initialize GeolocateControl for "Blue Dot" with heading
        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true,
            showAccuracyCircle: true,
        });

        // Add control to map (we'll hide the default button via CSS)
        map.current.addControl(geolocate);
        geolocateRef.current = geolocate;

        // Sync user location state when geolocate updates
        geolocate.on('geolocate', (e) => {
            const { longitude, latitude } = e.coords;
            setUserLocation([longitude, latitude]);
        });

        // Default GeolocateControl removed in favor of custom button

        map.current.on('load', () => {
            setIsMapLoaded(true);
            // @ts-ignore
            window.campusMapLoaded = true;

            // Add markers (hidden by default)
            getBuildings().forEach(building => {
                const el = document.createElement('div');
                el.className = 'building-marker';
                el.style.backgroundColor = building.color;
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.cursor = 'pointer';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                el.style.display = 'none'; // Hidden by default

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setSelectedBuilding(building);
                    flyToBuilding(building.location);
                });

                if (map.current) {
                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([building.location.lng, building.location.lat])
                        .addTo(map.current);
                    markersRef.current.push(marker);
                }
            });
        });

        map.current.on('click', () => {
            // Only clear selection if we are NOT navigating, OR if the user wants to close the popup.
            // If navigating, we might want to keep the route but just close popup? 
            // The prompt says: "change the button to a 'Cancel Route' button where if the users presses cancel navigation it cancels the route they just started and closes that little pop up window as a whole"
            // So if they click away, standardized behavior is usually just close popup. 
            // We'll leave this as is: it clears selectedBuilding. The navigation state persists until they hit cancel or new route.
            if (selectedBuilding) {
                setSelectedBuilding(null);
            }
        });

    }, []);

    // Show/hide markers based on search state
    useEffect(() => {
        markersRef.current.forEach(marker => {
            const el = marker.getElement();
            if (hasSearched) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }, [hasSearched]);

    const flyToBuilding = useCallback((location: { lat: number, lng: number }) => {
        if (map.current && isMapLoaded) {
            map.current.flyTo({
                center: [location.lng, location.lat],
                zoom: 17,
                essential: true
            });
        }
    }, [isMapLoaded]);

    useEffect(() => {
        if (isMapLoaded && selectedBuilding) {
            flyToBuilding(selectedBuilding.location);
        }
    }, [isMapLoaded, selectedBuilding, flyToBuilding]);

    const handleCustomGeolocate = () => {
        if (geolocateRef.current) {
            geolocateRef.current.trigger();
        }
    };

    const handleSearchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setHasSearched(true);
        setIsSearching(true);
        setSelectedBuilding(null);

        // 1. Try Local Resolution first
        const localResult = resolveBuilding(searchQuery);
        if (localResult) {
            setSelectedBuilding(localResult);
            flyToBuilding(localResult.location);
            setIsSearching(false);
            return;
        }

        // 2. Fallback to Mapbox Geocoding API
        try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) throw new Error('No token');

            // Bias the search by appending "UCSB" or using proximity more aggressively
            const enhancedQuery = `${searchQuery} UCSB`;
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(enhancedQuery)}.json`;
            const params = new URLSearchParams({
                access_token: token,
                bbox: UCSB_BBOX.join(','), // Bias to UCSB
                proximity: `${UCSB_CENTER[0]},${UCSB_CENTER[1]}`, // Bias to center
                limit: '1'
            });

            const res = await fetch(`${endpoint}?${params}`);
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const [lng, lat] = feature.center;

                // Create a temporary building object for the result
                const tempBuilding: Building = {
                    id: 'MAPBOX_RESULT',
                    name: feature.text, // e.g. "Old Gym"
                    abbr: [feature.text],
                    location: { lat, lng },
                    color: '#64748b' // Slate-500 generic color
                };

                setSelectedBuilding(tempBuilding);
                flyToBuilding({ lat, lng });
            } else {
                // If "Old Gym UCSB" fails, try raw query as last resort
                if (searchQuery !== enhancedQuery) {
                    const rawEndpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json`;
                    const rawRes = await fetch(`${rawEndpoint}?${params}`);
                    const rawData = await rawRes.json();
                    if (rawData.features && rawData.features.length > 0) {
                        const feature = rawData.features[0];
                        const [lng, lat] = feature.center;
                        const tempBuilding: Building = {
                            id: 'MAPBOX_RESULT',
                            name: feature.text,
                            abbr: [feature.text],
                            location: { lat, lng },
                            color: '#64748b'
                        };
                        setSelectedBuilding(tempBuilding);
                        flyToBuilding({ lat, lng });
                        return;
                    }
                }
                alert('No results found for that location.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Error searching for location.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleScheduleImport = () => {
        const regex = /([A-Za-z]{2,})\s+(\d{3,4}[A-Za-z]?)/g;
        let match = regex.exec(scheduleText);
        if (match) {
            const abbr = match[1];
            const building = resolveBuilding(abbr);
            if (building) {
                setShowScheduleModal(false);
                setScheduleText('');
                setHasSearched(true);
                setSelectedBuilding(building);
                flyToBuilding(building.location);
            }
        }
    };

    const handleGetDirections = () => {
        if (!selectedBuilding || !directionsRef.current) return;

        if (userLocation) {
            directionsRef.current.setOrigin(userLocation);
            directionsRef.current.setDestination([selectedBuilding.location.lng, selectedBuilding.location.lat]);
            setIsNavigating(true);
        } else {
            alert("Please enable location services or click the 'Find My Location' arrow first.");
        }
    };

    const handleCancelRoute = () => {
        if (directionsRef.current) {
            directionsRef.current.removeRoutes();
            // Also need to clear origin/destination to fully reset visual state if possible,
            // but removeRoutes() is usually sufficient for visual.
            // setOrigin(null) might be needed if the plugin holds state.
            // The mapbox-gl-directions API is limited in types here, usually removeRoutes clears the line.
        }
        setIsNavigating(false);
        setSelectedBuilding(null); // Close the popup
    };

    if (tokenError) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                <h2 className="text-red-600 text-xl font-bold mb-2">Mapbox Token Missing</h2>
                <p className="text-slate-600 mb-4">You need to set NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables.</p>
                <div className="bg-white p-4 rounded shadow text-left max-w-sm w-full mx-auto">
                    <p className="font-mono text-xs bg-slate-100 p-2 rounded break-all">NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...</p>
                </div>
                <button className="mt-6 text-blue-600 underline" onClick={() => router.push('/')}>Back Home</button>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full bg-slate-200">
            <div ref={mapContainer} className="h-full w-full" />

            {/* --- Mobile Header (Visible on < sm) --- */}
            <div className="absolute top-2 left-2 right-2 z-20 flex sm:hidden items-center gap-2">
                {/* Back */}
                <button
                    onClick={() => router.push('/')}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex-none flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                </button>

                {/* Plus */}
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex-none flex items-center justify-center transition-colors"
                >
                    <Plus className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                </button>

                {/* Search Bar (Condensed) */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative shadow-lg rounded-xl h-9">
                    <input
                        className="w-full h-full pl-9 pr-8 rounded-xl border-none outline-none bg-white/90 backdrop-blur-sm text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                    />
                    <Search className="absolute left-3 top-2 h-4 w-4 text-slate-500" />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </form>

                {/* Profile */}
                <button
                    onClick={() => setShowAccountModal(true)}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex-none flex items-center justify-center transition-colors"
                >
                    <User className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                </button>

                {/* Menu */}
                <button
                    onClick={() => {/* Menu placeholder */ }}
                    className="w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex-none flex items-center justify-center transition-colors"
                >
                    <Menu className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                </button>
            </div>


            {/* --- Desktop Controls (Visible on sm+) --- */}

            {/* Top Left Controls Group */}
            <div className="absolute top-4 left-4 z-10 hidden sm:flex flex-col gap-3 sm:flex-row">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/')}
                    className="w-12 h-12 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-slate-500" strokeWidth={1.8} />
                </button>

                {/* Add Schedule Button */}
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-12 h-12 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                >
                    <Plus className="h-6 w-6 text-slate-500" strokeWidth={1.8} />
                </button>
            </div>

            {/* Top Search Bar (Desktop) - Adjusted margins */}
            <div className="absolute top-4 left-4 right-4 sm:left-32 sm:right-20 md:left-1/2 md:-translate-x-1/2 md:w-96 z-10 hidden sm:block">
                <form onSubmit={handleSearchSubmit} className="relative shadow-lg rounded-xl">
                    <input
                        className="w-full h-12 pl-12 pr-4 rounded-xl border-none outline-none bg-white/90 backdrop-blur-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                        placeholder="Search buildings..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                    />
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 p-1 rounded-full hover:bg-slate-200 text-slate-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </form>
            </div>

            {/* Top Right Controls Group */}
            <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-3 sm:flex-row">
                {/* Account Button */}
                <button
                    onClick={() => setShowAccountModal(true)}
                    className="w-12 h-12 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                >
                    <User className="h-6 w-6 text-slate-500" strokeWidth={1.8} />
                </button>

                {/* Menu Button */}
                <button
                    onClick={() => {/* Menu action placeholder */ }}
                    className="w-12 h-12 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                >
                    <Menu className="h-6 w-6 text-slate-500" strokeWidth={1.8} />
                </button>
            </div>

            {/* Custom Bottom Right Location Button */}
            <button
                onClick={handleCustomGeolocate}
                className="absolute bottom-24 left-4 sm:bottom-6 sm:left-6 z-20 w-9 h-9 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors group"
                title="Find My Location"
            >
                <MapPin
                    className={`h-4 w-4 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform ${userLocation ? 'text-green-500' : 'text-red-500'}`}
                    strokeWidth={2}
                />
            </button>

            {/* Account Modal */}
            {showAccountModal && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAccountModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Account</h2>
                            <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center space-y-6">
                            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center">
                                <User className="h-12 w-12 text-slate-400" />
                            </div>

                            <div className="w-full space-y-3">
                                <button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                                    Sign in with UCSB Gold
                                </button>
                                <p className="text-xs text-center text-slate-500">
                                    Connect your Gold account to sync your schedule
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Import Modal */}
            {showScheduleModal && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowScheduleModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-6 w-6 text-blue-600" />
                                <h2 className="text-2xl font-bold text-slate-900">Import Schedule</h2>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-slate-600">Paste your class schedule from UCSB Gold or email</p>
                            <textarea
                                className="w-full h-64 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none resize-none font-mono text-sm transition-all"
                                placeholder="PHELP 3526&#10;ILP 1201&#10;CHEM 1179..."
                                value={scheduleText}
                                onChange={e => setScheduleText(e.target.value)}
                            />
                            <button
                                onClick={handleScheduleImport}
                                disabled={!scheduleText.trim()}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                            >
                                Find Classrooms
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Building Card */}
            {selectedBuilding && (
                <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-2xl shadow-xl p-5 z-20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{selectedBuilding.name}</h2>
                            <p className="text-sm text-slate-500 font-mono">
                                {selectedBuilding.id === 'MAPBOX_RESULT' ? 'Map Location' : selectedBuilding.id}
                            </p>
                        </div>
                        <button onClick={() => setSelectedBuilding(null)} className="p-1 rounded-full hover:bg-slate-100">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-3 mt-4">
                        {selectedBuilding.id !== 'MAPBOX_RESULT' && (
                            <button
                                onClick={() => router.push(`/building/${selectedBuilding.id}`)}
                                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <MapIcon className="h-5 w-5" />
                                Open Indoor Map
                            </button>
                        )}

                        {isNavigating ? (
                            <button
                                onClick={handleCancelRoute}
                                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <X className="h-5 w-5" />
                                Cancel Route
                            </button>
                        ) : (
                            <button
                                onClick={handleGetDirections}
                                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <Navigation className="h-5 w-5" />
                                Directions (Walk)
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Hide the default Mapbox Geolocate Button */}
            <style jsx global>{`
                .mapboxgl-ctrl-geolocate {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
