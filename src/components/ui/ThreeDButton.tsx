'use client';

import React from 'react';

interface ThreeDButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'accent' | 'outline';
    depth?: number; // How "deep" the 3D effect is in pixels
    glowEffect?: boolean; // Enable the "Colorful" gradient glow
}

export default function ThreeDButton({
    children,
    className = '',
    variant = 'primary',
    depth = 6,
    glowEffect,
    onClick,
    ...props
}: ThreeDButtonProps) {

    // Color Presets (Tailwind classes don't work well for arbitrary calculated shadows without JIT complexity,
    // so we'll use inline styles or specific color combos. Let's use Tailwind utility combos.)

    // Mappings for styles
    // We need a "front" color and a "shadow/edge" color.

    const variants = {
        primary: {
            // Navy with a strong blue/navy glow
            front: 'bg-[#003660] text-white border-t border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]',
            edge: 'bg-[#002038]',
            container: 'shadow-[0_20px_50px_-12px_rgba(0,54,96,0.5)] hover:shadow-[0_30px_60px_-15px_rgba(0,54,96,0.6)]'
        },
        secondary: {
            front: 'bg-white text-black border-2 border-slate-100',
            edge: 'bg-slate-200',
            container: 'shadow-[0_20px_50px_-12px_rgba(203,213,225,0.6)]'
        },
        accent: {
            // Gold with a warm glow
            front: 'bg-[#FEBC11] text-[#003660] border-t border-white/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]',
            edge: 'bg-[#D69E0E]', // Darker Gold
            container: 'shadow-[0_20px_50px_-12px_rgba(254,188,17,0.6)] hover:shadow-[0_30px_60px_-15px_rgba(254,188,17,0.8)]'
        },
        outline: {
            front: 'bg-white text-black border-2 border-slate-900',
            edge: 'bg-slate-900',
            container: ''
        }
    };

    const currentVariant = variants[variant] || variants.primary;

    return (
        <button
            onClick={onClick}
            className={`group relative inline-block focus:outline-none transition-all duration-300 ${currentVariant.container} rounded-xl ${className}`}
            {...props}
        >
            {/* The "Shadow" / Edge Layer - sits behind and offset downwards */}
            <span
                className={`absolute top-0 left-0 w-full h-full rounded-xl ${currentVariant.edge} transition-transform duration-100 will-change-transform`}
                style={{
                    transform: `translateY(${depth}px)`,
                }}
            />

            {/* The "Front" Face Layer */}
            <span
                className={`relative block w-full h-full rounded-xl ${currentVariant.front} font-bold transform transition-transform duration-100 will-change-transform active:translate-y-[6px] group-hover:-translate-y-[2px] overflow-hidden`}
            >
                {/* Colorful Glow Gradient Effect (replaces shiny) */}
                {glowEffect && (
                    <span
                        className="absolute inset-0 bg-gradient-to-r from-[#FEBC11] via-white/50 to-[#FEBC11] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 scale-150"
                        style={{ mixBlendMode: 'overlay' }}
                    />
                )}

                {/* Subtle base gradient for texture */}
                {glowEffect && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
                )}

                <span className="relative z-20 flex items-center justify-center w-full h-full px-4 py-3 leading-tight">
                    {children}
                </span>
            </span>
        </button>
    );
}
