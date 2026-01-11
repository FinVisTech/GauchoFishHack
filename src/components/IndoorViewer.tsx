'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import type { GraphNode } from '@/lib/data';

interface IndoorViewerProps {
    src: string;
    width: number;
    height: number;
    pathNodes?: GraphNode[];
    fullPath?: GraphNode[];
    currentFloor?: number;
}

export default function IndoorViewer({ src, width, height, pathNodes = [], fullPath = [], currentFloor = 1 }: IndoorViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const touchStartDistance = useRef<number>(0);

    // Debug logging
    useEffect(() => {
        if (pathNodes.length > 0) {
            console.log('📊 IndoorViewer received path nodes:', pathNodes.length);
            console.log('  Dimensions:', { width, height });
            console.log('  First node:', pathNodes[0]);
            console.log('  Last node:', pathNodes[pathNodes.length - 1]);
        }
    }, [pathNodes, width, height]);

    // Reset view when src changes
    useEffect(() => {
        setScale(0.5);
        setPosition({ x: 0, y: 0 });
        setImageLoaded(false);
        setImageError(false);
        console.log('🖼️  Loading image from:', src);
    }, [src]);

    // Mouse/Touch drag handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handlePointerUp = () => setIsDragging(false);

    // Touch pinch-to-zoom
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchStartDistance.current > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const pinchDelta = (currentDistance - touchStartDistance.current) * 0.01;
            setScale(s => Math.min(Math.max(0.1, s + pinchDelta), 4));
            touchStartDistance.current = currentDistance;
        }
    };

    const handleTouchEnd = () => {
        touchStartDistance.current = 0;
    };

    const handleWheel = (e: React.WheelEvent) => {
        // optional zoom on wheel
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setScale(s => Math.min(Math.max(0.1, s + delta), 4));
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-950 select-none">
            {/* Zoom controls - larger on mobile */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-md p-2 md:p-1">
                <button onClick={() => setScale(s => Math.min(s * 1.2, 4))} className="p-3 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Zoom in"><ZoomIn className="h-5 md:h-4 w-5 md:w-4" /></button>
                <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} className="p-3 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Zoom out"><ZoomOut className="h-5 md:h-4 w-5 md:w-4" /></button>
                <button onClick={() => { setScale(0.5); setPosition({ x: 0, y: 0 }); }} className="p-3 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Reset view"><Maximize className="h-5 md:h-4 w-5 md:w-4" /></button>
            </div>

            {/* Image loading debug info */}
            {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-0">
                    <div className="text-sm text-slate-500">Loading floor plan...</div>
                </div>
            )}
            {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-950 z-0">
                    <div className="text-sm text-red-600 dark:text-red-200">Failed to load image: {src}</div>
                </div>
            )}

            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        width: width,
                        height: height,
                    }}
                    className="relative bg-white/50 shadow-2xl"
                >
                    {/* Floor plan image - using img tag for better mobile compatibility */}
                    <img
                        src={src}
                        alt="Floor plan"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                            console.error('❌ Failed to load image:', src);
                            setImageError(true);
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: imageError ? 'none' : 'block'
                        }}
                    />

                    {/* Path overlay */}
                    {pathNodes.length > 0 && imageLoaded && (
                        <svg
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none'
                            }}
                            viewBox={`0 0 ${width} ${height}`}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Draw path lines */}
                            {pathNodes.map((node, i) => {
                                if (i === 0) return null;
                                const prevNode = pathNodes[i - 1];
                                return (
                                    <line
                                        key={`line-${i}`}
                                        x1={prevNode.x}
                                        y1={-prevNode.y}
                                        x2={node.x}
                                        y2={-node.y}
                                        stroke="#3b82f6"
                                        strokeWidth="4"
                                        strokeDasharray="8 4"
                                        strokeLinecap="round"
                                    />
                                );
                            })}
                            
                            {/* Draw nodes */}
                            {pathNodes.map((node, i) => (
                                <circle
                                    key={`node-${i}`}
                                    cx={node.x}
                                    cy={-node.y}
                                    r="6"
                                    fill={i === 0 ? '#10b981' : i === pathNodes.length - 1 ? '#ef4444' : '#3b82f6'}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                            ))}
                            
                            {/* Label start and end */}
                            {pathNodes.length > 0 && (
                                <>
                                    {/* Determine if this floor has the start node */}
                                    {fullPath.length > 0 && fullPath[0].floor === currentFloor && (
                                        <text
                                            x={fullPath[0].x}
                                            y={-fullPath[0].y - 15}
                                            fill="#10b981"
                                            fontSize="14"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            style={{ textShadow: '0 0 3px white' }}
                                        >
                                            START
                                        </text>
                                    )}
                                    
                                    {/* Determine if this floor has the end node */}
                                    {fullPath.length > 0 && fullPath[fullPath.length - 1].floor === currentFloor && (
                                        <text
                                            x={fullPath[fullPath.length - 1].x}
                                            y={-fullPath[fullPath.length - 1].y - 15}
                                            fill="#ef4444"
                                            fontSize="14"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            style={{ textShadow: '0 0 3px white' }}
                                        >
                                            {fullPath[fullPath.length - 1].room_num ? `ROOM ${fullPath[fullPath.length - 1].room_num}` : 'END'}
                                        </text>
                                    )}
                                    
                                    {/* Label floor transitions as ASCEND (except on target floor) */}
                                    {fullPath.length > 0 && currentFloor !== fullPath[fullPath.length - 1].floor && (
                                        pathNodes.map((node, i) => {
                                            // Check if this node is a floor transition (connector type)
                                            if (node.type === 1 && (i === pathNodes.length - 1)) {
                                                return (
                                                    <text
                                                        key={`ascend-${i}`}
                                                        x={node.x}
                                                        y={-node.y - 15}
                                                        fill="#f59e0b"
                                                        fontSize="12"
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                        style={{ textShadow: '0 0 3px white' }}
                                                    >
                                                        ASCEND
                                                    </text>
                                                );
                                            }
                                            return null;
                                        })
                                    )}
                                </>
                            )}
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}
