'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import LiquidGlass from 'liquid-glass-react';

export default function LiquidGlassContainer({ children, visual, measure, onMeasure, visualBoxSize }) {
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef(null);
    const measureRef = useRef(null);

    // Mouse-driven positions to feed into LiquidGlass
    const [globalMousePos, setGlobalMousePos] = useState({ x: 0, y: 0 });
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

    const [containerWidth, setContainerWidth] = useState(400); // Default width in pixels
    const [containerHeight, setContainerHeight] = useState(120); // Default height in pixels
    const minWidth = 200;
    const maxWidth = 800;
    const minHeight = 60;
    const maxHeight = 400;

    // Invisible text measurement result
    const [, setMeasuredSize] = useState({ width: 0, height: 0 });
    const autoSizeFromText = true; // set to true to auto-fit container to measured text size
    const [measuredDone, setMeasuredDone] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Measure the size of the invisible text layer and optionally set container size
    useLayoutEffect(() => {
        if (!isClient) return;

        let rafId = 0;
        let scheduled = false;

        const measure = () => {
            scheduled = false;
            if (!measureRef.current) return;
            const rect = measureRef.current.getBoundingClientRect();
            const w = Math.ceil(rect.width);
            const h = Math.ceil(rect.height);

            // Only update measured state if it actually changed
            setMeasuredSize(prev => {
                const changed = prev.width !== w || prev.height !== h;
                if (changed) {
                    const size = { width: w, height: h };
                    // Notify parent asynchronously to avoid setState during render
                    if (onMeasure) {
                        setTimeout(() => {
                            try { onMeasure(size); } catch (e) { /* swallow */ }
                        }, 0);
                    }
                    return size;
                }
                return prev;
            });

            if (autoSizeFromText) {
                const targetW = Math.max(minWidth, Math.min(maxWidth, w));
                const targetH = Math.max(minHeight, Math.min(maxHeight, h));
                // Update only if different to avoid loops
                setContainerWidth(prev => (prev !== targetW ? targetW : prev));
                setContainerHeight(prev => (prev !== targetH ? targetH : prev));
                if (!measuredDone) setMeasuredDone(true);
            }
        };

        const scheduleMeasure = () => {
            if (scheduled) return;
            scheduled = true;
            rafId = requestAnimationFrame(measure);
        };

        // Initial measurement and observer for realtime changes
        scheduleMeasure();

        const ro = new ResizeObserver(scheduleMeasure);
        if (measureRef.current) ro.observe(measureRef.current);

        const onResize = scheduleMeasure;
        window.addEventListener('resize', onResize);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
            window.removeEventListener('resize', onResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [measure, isClient, measuredDone]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let rafId = null;
        const detectionRadius = 100; // Pixels to make mouse detectable from closer/farther away

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
            // Touchmove listener can't be removed easily as it's an anonymous function above; left intentionally for simplicity
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

    // Before initial measurement, render only the off-screen measurement element
    if (autoSizeFromText && !measuredDone) {
        return (
            <div
                aria-hidden="true"
                ref={measureRef}
                style={{
                    position: 'fixed',
                    top: '-100000px',
                    left: '-100000px',
                    opacity: 0,
                    pointerEvents: 'none',
                    visibility: 'hidden',
                    whiteSpace: 'pre-line'
                }}
                className="lg-measure"
            >
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    boxSizing: 'border-box'
                }}>
                    {measure ?? children}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative inline-block liquid-stack"
            style={{
                width: `${containerWidth}px`,
                height: `${containerHeight}px`
            }}
        >
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
                width={containerWidth}
                height={containerHeight}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Inner auto-sized content box: centers children but does not stretch to full width */}
                <div style={{
                    position: visualBoxSize ? 'absolute' : 'static',
                    top: visualBoxSize ? '50%' : undefined,
                    left: visualBoxSize ? '50%' : undefined,
                    transform: visualBoxSize ? 'translate(-50%, -50%)' : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0rem',
                    boxSizing: 'border-box',
                    width: visualBoxSize ? `${visualBoxSize.width}px` : undefined,
                    height: visualBoxSize ? `${visualBoxSize.height}px` : undefined
                }}>
                    {visual ?? children}
                </div>
            </LiquidGlass>

            {/* Invisible measurement layer: off-screen, same content to get intrinsic size */}
            <div
                aria-hidden="true"
                ref={measureRef}
                style={{
                    position: 'fixed',
                    top: '-100000px',
                    left: '-100000px',
                    opacity: 0,
                    pointerEvents: 'none',
                    visibility: 'hidden',
                    whiteSpace: 'pre-line'
                }}
                className="lg-measure"
            >
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    boxSizing: 'border-box'
                }}>
                    {measure ?? children}
                </div>
            </div>
        </div>
    );
}
