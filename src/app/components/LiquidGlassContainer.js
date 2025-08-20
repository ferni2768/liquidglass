'use client';

import { useState, useEffect, useRef } from 'react';
import LiquidGlass from 'liquid-glass-react';

export default function LiquidGlassContainer({ children }) {
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef(null);

    // Mouse-driven positions to feed into LiquidGlass
    const [globalMousePos, setGlobalMousePos] = useState({ x: 0, y: 0 });
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let rafId = null;
        const detectionRadius = 100; // pixels to make mouse detectable from closer/farther away

        function onMove(e) {
            const cx = e.clientX;
            const cy = e.clientY;

            setGlobalMousePos({ x: cx, y: cy });

            if (!containerRef.current) {
                // If no container ref, set a small normalized offset
                setMouseOffset({ x: 0, y: 0 });
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = cx - centerX;
            const dy = cy - centerY;
            const dist = Math.hypot(dx, dy);

            // Normalize by the detection radius so offsets remain small even at long distances
            let nx = dx / detectionRadius;
            let ny = dy / detectionRadius;

            // Optionally clamp to [-1, 1] to keep values stable
            nx = Math.max(-1, Math.min(1, nx));
            ny = Math.max(-1, Math.min(1, ny));

            // Throttle updates to animation frames for performance
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    setMouseOffset({ x: nx, y: ny });
                    rafId = null;
                });
            }
        }

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('touchmove', (ev) => {
            if (ev.touches && ev.touches[0]) onMove(ev.touches[0]);
        }, { passive: true });

        return () => {
            window.removeEventListener('mousemove', onMove);
            // touchmove listener can't be removed easily as it's an anonymous function above; left intentionally for simplicity
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    if (!isClient) {
        return (
            <div className="p-6 bg-white/10 backdrop-blur-sm rounded-3xl">
                {children}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative inline-block liquid-stack">
            <LiquidGlass
                displacementScale={70}
                blurAmount={0.1}
                saturation={80}
                aberrationIntensity={7.5}
                elasticity={0.4}
                cornerRadius={999}
                mode="standard"
                mouseContainer={containerRef}
                globalMousePos={globalMousePos}
                mouseOffset={mouseOffset}
            >
                {children}
            </LiquidGlass>
        </div>
    );
}
