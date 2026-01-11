'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import gsap from 'gsap';

// UCSB Colors
const UCSB_NAVY = '#003660';
const UCSB_GOLD = '#FEBC11';

// Cubic Bezier Helpers
type Point = { x: number; y: number };

function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const oneMinusT = 1 - t;
    const x = Math.pow(oneMinusT, 3) * p0.x + 3 * Math.pow(oneMinusT, 2) * t * p1.x + 3 * oneMinusT * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
    const y = Math.pow(oneMinusT, 3) * p0.y + 3 * Math.pow(oneMinusT, 2) * t * p1.y + 3 * oneMinusT * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;
    return { x, y };
}

function getBezierDerivative(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const oneMinusT = 1 - t;
    const x = 3 * Math.pow(oneMinusT, 2) * (p1.x - p0.x) + 6 * oneMinusT * t * (p2.x - p1.x) + 3 * Math.pow(t, 2) * (p3.x - p2.x);
    const y = 3 * Math.pow(oneMinusT, 2) * (p1.y - p0.y) + 6 * oneMinusT * t * (p2.y - p1.y) + 3 * Math.pow(t, 2) * (p3.y - p2.y);
    return { x, y };
}

export default function LandingHero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLHeadingElement>(null);
    const mRef = useRef<HTMLSpanElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Refs for the new approach
    const taperedPathRef = useRef<SVGPathElement>(null); // The visible filled shape
    const maskPathRef = useRef<SVGPathElement>(null);    // The invisible revealer
    const arrowHeadRef = useRef<SVGPathElement>(null);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Handle resize updates
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        document.fonts.ready.then(updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Main Draw Logic
    useLayoutEffect(() => {
        if (!mRef.current || !textRef.current || !taperedPathRef.current || !maskPathRef.current || !arrowHeadRef.current || !svgRef.current) return;

        const draw = () => {
            const svgRect = svgRef.current!.getBoundingClientRect();
            const mRect = mRef.current!.getBoundingClientRect();
            const textRect = textRef.current!.getBoundingClientRect();

            // --- 1. Define the Curve Control Points ---

            // Start: Connect directly to the bottom of the right leg of 'm'
            // EXTENDING start point vertically into the leg as requested.
            // Using a significantly larger negative offset (-18) to overlap deep.
            const startX = mRect.right - svgRect.left - (mRect.width * 0.15);
            const startY = mRect.bottom - svgRect.top - 18;

            // End: Left of "Find"
            const endX = textRect.left - svgRect.left - 20;

            const width = startX - endX;

            // Control Points (S-Curve)
            // Goal: "Superfluid" connection.
            // Since startY is higher, we need a longer drop to keep the curve low.

            const cp1X = startX;
            const cp1Y = startY + 70; // Increased drop to compensate for higher start

            // CP2: Push inflection
            const cp2X = endX + (width * 0.35);
            const cp2Y = startY - 5; // Adjusted relative to new startY

            const endY = startY + 25; // Adjusted endY to stay lower than the new high start

            const start = { x: startX, y: startY };
            const cp1 = { x: cp1X, y: cp1Y };
            const cp2 = { x: cp2X, y: cp2Y };
            const end = { x: endX, y: endY };

            // --- 2. Generate Tapered Polygon ---
            const steps = 60;
            const leftPoints: Point[] = [];
            const rightPoints: Point[] = [];

            // Refined: Thinner start (12px) for perfect match.
            const startWidth = 12;
            const endWidth = 4;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pt = getBezierPoint(t, start, cp1, cp2, end);
                const dev = getBezierDerivative(t, start, cp1, cp2, end);

                // Calculate Normal Vector
                const len = Math.sqrt(dev.x * dev.x + dev.y * dev.y);
                // Normal is (-y, x) normalized
                const nx = -dev.y / len;
                const ny = dev.x / len;

                // Lerp Width
                const currentWidth = startWidth + (endWidth - startWidth) * t;
                const halfWidth = currentWidth / 2;

                leftPoints.push({
                    x: pt.x + nx * halfWidth,
                    y: pt.y + ny * halfWidth
                });
                rightPoints.push({
                    x: pt.x - nx * halfWidth,
                    y: pt.y - ny * halfWidth
                });
            }

            // Construct Polygon Path Data
            // Start -> Left Side -> End -> Right Side Backwards -> Close
            let d = `M ${leftPoints[0].x},${leftPoints[0].y}`;
            for (let i = 1; i < leftPoints.length; i++) {
                d += ` L ${leftPoints[i].x},${leftPoints[i].y}`;
            }
            for (let i = rightPoints.length - 1; i >= 0; i--) {
                d += ` L ${rightPoints[i].x},${rightPoints[i].y}`;
            }
            d += ' Z';

            taperedPathRef.current!.setAttribute('d', d);

            // --- 3. Set Mask and Arrow Geometry ---

            // The Mask uses the simple center-line path, but with a THICK stroke to reveal
            const centerLineD = `M ${start.x},${start.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;
            maskPathRef.current!.setAttribute('d', centerLineD);

            // Arrowhead rotation
            // Tangent at t=1 (End) is the Derivative at t=1
            const endDev = getBezierDerivative(1, start, cp1, cp2, end);
            const angle = Math.atan2(endDev.y, endDev.x) * (180 / Math.PI);

            const arrowSize = 8;
            const arrowPath = `M -${arrowSize},-${arrowSize} L 0,0 L -${arrowSize},${arrowSize}`;
            arrowHeadRef.current!.setAttribute('d', arrowPath);
            arrowHeadRef.current!.setAttribute('transform', `translate(${end.x}, ${end.y}) rotate(${angle})`);
        };

        draw();
        document.fonts.ready.then(draw);

        // --- 4. Animation ---
        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' }
        });

        const len = maskPathRef.current!.getTotalLength();

        // Initial States
        // Mask is hidden (strokeDashoffset = length)
        gsap.set(maskPathRef.current, {
            strokeDasharray: len,
            strokeDashoffset: len,
            autoAlpha: 1
        });

        // Tapered Shape is ALREADY visible, but hidden by the mask!
        // We just need to ensure opacity is 1
        gsap.set(taperedPathRef.current, {
            autoAlpha: 1
        });

        // Arrowhead hidden
        gsap.set(arrowHeadRef.current, {
            autoAlpha: 0,
            stroke: UCSB_GOLD, // End color
            strokeWidth: 4
        });

        // Animate the MASK to reveal the shape
        tl.to(maskPathRef.current, {
            strokeDashoffset: 0,
            duration: 2.0,
            ease: 'power2.inOut' // S-curve easing matches the shape
        })
            // Simultaneous Opacity Fade to handle any anti-aliasing artifacts? Not needed usually.

            // Arrowhead Pop
            .to(arrowHeadRef.current, {
                autoAlpha: 1,
                duration: 0.1
            }, '-=0.1')
            .to(arrowHeadRef.current, {
                // Already Gold, maybe a scale punch?
                scale: 1.2,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            }, '<');

    }, [dimensions]);

    return (
        <div ref={containerRef} className="relative w-full max-w-4xl mx-auto mb-12 text-center select-none">
            <div className="relative inline-block px-4">
                {/* Text Layer */}
                <h1
                    ref={textRef}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white relative z-10"
                >
                    Find your classroo
                    <span
                        ref={mRef}
                        className="inline-block"
                        style={{ color: UCSB_NAVY }}
                    >m</span>
                </h1>

                {/* SVG Layer */}
                <svg
                    ref={svgRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
                    style={{ zIndex: 0 }}
                >
                    <defs>
                        <mask id="hero-mask" maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                            {/* This path reveals content. White = Visible. */}
                            <path
                                ref={maskPathRef}
                                fill="none"
                                stroke="white"
                                strokeWidth="60" // Ensure it covers the widest part + buffer
                                strokeLinecap="round" // Round cap avoids hard cuts
                                strokeLinejoin="round"
                            />
                        </mask>
                        <linearGradient id="taper-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={UCSB_GOLD} />
                            <stop offset="100%" stopColor={UCSB_NAVY} />
                        </linearGradient>
                    </defs>

                    {/* The Tapered Shape (Masked) */}
                    <path
                        ref={taperedPathRef}
                        mask="url(#hero-mask)"
                        fill="url(#taper-gradient)"
                        className="opacity-0"
                    />

                    {/* The Arrowhead (Separate) */}
                    <path
                        ref={arrowHeadRef}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0"
                    />
                </svg>
            </div>

            <p className="mt-16 text-xl text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                AI Powered Navigation
            </p>
        </div >
    );
}
