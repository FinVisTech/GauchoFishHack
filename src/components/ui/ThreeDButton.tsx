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

    const variants = {
        primary: {
            front: 'bg-[#003660] text-white border-t border-white/20',
            edge: '#002038',
            container: 'shadow-[0_20px_50px_-12px_rgba(0,54,96,0.5)]'
        },
        secondary: {
            front: 'bg-white text-black border-2 border-slate-100',
            edge: '#e2e8f0', // slate-200
            container: 'shadow-[0_20px_50px_-12px_rgba(203,213,225,0.6)]'
        },
        accent: {
            front: 'bg-[#FEBC11] text-[#003660] border-t border-white/40',
            edge: '#D69E0E',
            container: 'shadow-[0_20px_50px_-12px_rgba(254,188,17,0.6)]'
        },
        outline: {
            front: 'bg-white text-black border-2 border-slate-900',
            edge: '#0f172a', // slate-900
            container: ''
        }
    };

    const currentVariant = variants[variant] || variants.primary;

    return (
        <button
            onClick={onClick}
            className={`group relative inline-block focus:outline-none transition-all duration-100 ${currentVariant.container} rounded-xl ${className}`}
            style={{
                // Initial state: standard translateY to 0
                transform: 'translateY(0)',
            }}
            {...props}
        >
            {/* The "Front" Face Layer - Now includes the 3D shadow via box-shadow */}
            <span
                className={`relative block w-full h-full rounded-xl ${currentVariant.front} font-bold overflow-hidden transition-all duration-100 will-change-transform group-active:translate-y-[var(--btn-depth)] group-active:shadow-none`}
                style={{
                    boxShadow: `0 ${depth}px 0 ${currentVariant.edge}`,
                    '--btn-depth': `${depth}px`,
                } as React.CSSProperties}
            >
                {/* Active state handling via a pseudo-element or direct style manipulation isn't ideal inline, 
                    so we use group-active on the parent to affect this child.
                    Actually, simpler: use group-active to translate the whole button down?
                    No, for 3D button:
                    Normal: box-shadow visible.
                    Pressed: box-shadow hidden (or reduced), element moves down.
                */}
                {/* Active state handling: Using group-active utility on parent and CSS variable for depth */}

                {/* Colorful Glow Gradient Effect */}
                {/* {glowEffect && (
                    <span
                        className="absolute inset-0 bg-gradient-to-r from-[#FEBC11] via-white/50 to-[#FEBC11] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 scale-150"
                        style={{ mixBlendMode: 'overlay' }}
                    />
                )} */}

                {/* Subtle base gradient for texture */}
                {/* {glowEffect && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
                )} */}

                <span className="relative z-20 flex items-center justify-center w-full h-full px-4 py-3 leading-tight">
                    {children}
                </span>
            </span>
        </button>
    );
}
