'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface IndoorViewerProps {
    src: string;
    width: number;
    height: number;
}

export default function IndoorViewer({ src, width, height }: IndoorViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
                    {/* Room overlays could go here */}
                </div>
            </div>
        </div>
    );
}
