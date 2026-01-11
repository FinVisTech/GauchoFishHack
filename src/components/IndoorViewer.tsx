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
    }, [src]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);
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
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-md p-1">
                <button onClick={() => setScale(s => Math.min(s * 1.2, 4))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ZoomIn className="h-4 w-4" /></button>
                <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ZoomOut className="h-4 w-4" /></button>
                <button onClick={() => { setScale(0.5); setPosition({ x: 0, y: 0 }); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Maximize className="h-4 w-4" /></button>
            </div>

            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        width: width,
                        height: height,
                        backgroundImage: `url(${src})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                    className="bg-white/50 shadow-2xl"
                >
                    {/* Path overlay */}
                    {pathNodes.length > 0 && (
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
