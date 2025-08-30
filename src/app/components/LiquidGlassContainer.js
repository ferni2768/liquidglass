'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import LiquidGlass from 'liquid-glass-react';

export default function LiquidGlassContainer({ children, visual, measure, onMeasure, visualBoxSize, phase }) {
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef(null);
    const measureRef = useRef(null);

    // Mouse-driven positions to feed into LiquidGlass
    const [globalMousePos, setGlobalMousePos] = useState({ x: 0, y: 0 });
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

    const [containerWidth, setContainerWidth] = useState(400);
    const [containerHeight, setContainerHeight] = useState(120);

    const [, setMeasuredSize] = useState({ width: 0, height: 0 });
    const autoSizeFromText = true;
    const [measuredDone, setMeasuredDone] = useState(false);

    useEffect(() => setIsClient(true), []);

    // Compute a dynamic max width based on text length and screen size
    const getDynamicMaxWidth = (text) => {
        if (typeof window === 'undefined') return '80vw';
        const length = text?.length || 0;
        const vw = window.innerWidth;

        // Base maxWidth on text length and screen size for pleasing shapes
        let factor;
        if (length < 20) factor = 0.3; // Very short texts: narrow
        else if (length < 40) factor = 0.45; // Short texts: moderate
        else if (length < 80) factor = 0.6; // Medium texts: wider
        else factor = 0.75; // Long texts: wide but not full screen

        // Adjust based on screen size
        if (vw < 640) factor = Math.min(factor, 0.9); // Mobile: cap at 90%
        else if (vw < 1024) factor = Math.min(factor, 0.8); // Tablet: cap at 80%
        else factor = Math.min(factor, 0.7); // Desktop: cap at 70%

        const maxPx = Math.min(vw * factor, 1200);
        return `${maxPx}px`;
    };

    useLayoutEffect(() => {
        if (!isClient) return;
        let rafId = 0;
        let scheduled = false;

        const measureWithBalancedLines = (rootEl, text) => {
            try {
                if (!rootEl) return null;
                const target = rootEl.querySelector('.lg-measure-inner') || rootEl;

                // Get current layout
                const range = document.createRange();
                range.selectNodeContents(target);
                const rects = Array.from(range.getClientRects());

                if (rects.length <= 1) {
                    // Single line or no rects: use the element's border-box (includes padding)
                    const bb = target.getBoundingClientRect();
                    return { width: Math.ceil(bb.width), height: Math.ceil(bb.height) };
                }

                // Multi-line: check for orphaned short last line
                const lines = rects.filter(r => r.width > 10); // Filter out tiny fragments
                if (lines.length < 2) {
                    const bb = range.getBoundingClientRect();
                    const cs = typeof window !== 'undefined' ? window.getComputedStyle(target) : null;
                    const padX = cs ? (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) : 0;
                    const padY = cs ? (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) : 0;
                    return { width: Math.ceil(bb.width + padX), height: Math.ceil(bb.height + padY) };
                }

                const lastLine = lines[lines.length - 1];
                const maxLineWidth = Math.max(...lines.map(r => r.width));
                const avgLineWidth = lines.slice(0, -1).reduce((sum, r) => sum + r.width, 0) / (lines.length - 1);

                // If last line is significantly shorter than average (orphaned), try to rebalance
                const shortThreshold = 0.4; // Last line should be at least 40% of average

                if (lastLine.width < avgLineWidth * shortThreshold) {
                    // Try slightly narrower container to redistribute text
                    const currentMaxWidth = parseFloat(getComputedStyle(target).maxWidth);
                    const adjustedMaxWidth = currentMaxWidth * 0.85; // Reduce by 15%
                    target.style.maxWidth = `${adjustedMaxWidth}px`;

                    // Re-measure with adjusted width
                    range.selectNodeContents(target);
                    const newRects = Array.from(range.getClientRects()).filter(r => r.width > 10);

                    // Check if redistribution improved balance
                    if (newRects.length > 1) {
                        const newLastLine = newRects[newRects.length - 1];
                        const newAvgWidth = newRects.slice(0, -1).reduce((sum, r) => sum + r.width, 0) / (newRects.length - 1);

                        if (newLastLine.width >= newAvgWidth * shortThreshold) {
                            // Improvement! Use adjusted layout (element's border-box)
                            const bb = target.getBoundingClientRect();
                            return { width: Math.ceil(bb.width), height: Math.ceil(bb.height) };
                        }
                    }

                    // Revert if no improvement
                    target.style.maxWidth = `${currentMaxWidth}px`;
                    range.selectNodeContents(target);
                }

                // Use original measurement: element's border-box
                const bb = target.getBoundingClientRect();
                return { width: Math.ceil(bb.width), height: Math.ceil(bb.height) };

            } catch {
                return null;
            }
        };

        const doMeasure = () => {
            scheduled = false;
            if (!measureRef.current) return;

            // Extract text content for dynamic maxWidth calculation
            const target = measureRef.current.querySelector('.lg-measure-inner') || measureRef.current;
            const textContent = target.textContent || '';
            const dynamicMaxWidth = getDynamicMaxWidth(textContent);

            // Update maxWidth before measuring
            target.style.maxWidth = dynamicMaxWidth;

            const lineDims = measureWithBalancedLines(measureRef.current, textContent);
            const rect = measureRef.current.getBoundingClientRect();
            const w = lineDims?.width ?? Math.ceil(rect.width);
            const h = lineDims?.height ?? Math.ceil(rect.height);

            setMeasuredSize(prev => {
                const changed = prev.width !== w || prev.height !== h;
                if (changed) {
                    const size = { width: w, height: h };
                    if (onMeasure) {
                        setTimeout(() => { try { onMeasure(size); } catch (e) { } }, 0);
                    }
                    return size;
                }
                return prev;
            });

            if (autoSizeFromText) {
                // Always follow the functional (measured) size in real time
                setContainerWidth(w);
                setContainerHeight(h);
                if (!measuredDone) setMeasuredDone(true);
            }
        };

        const scheduleMeasure = () => {
            if (scheduled) return;
            scheduled = true;
            rafId = requestAnimationFrame(doMeasure);
        };

        scheduleMeasure();
        const ro = new ResizeObserver(scheduleMeasure);
        if (measureRef.current) ro.observe(measureRef.current);
        window.addEventListener('resize', scheduleMeasure);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [measure, isClient, measuredDone, onMeasure, visualBoxSize, phase]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let rafId = null;
        const detectionRadius = 100;

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
        window.addEventListener('touchmove', (ev) => { if (ev.touches && ev.touches[0]) onMove(ev.touches[0]); }, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onMove);
            // Touchmove listener can't be removed easily as it's an anonymous function above; left intentionally for simplicity
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    if (!isClient) return <div className="p-6 bg-white/10 backdrop-blur-sm rounded-3xl">{children}</div>;

    if (autoSizeFromText && !measuredDone) {
        return (
            <div aria-hidden ref={measureRef} style={{ position: 'fixed', top: '-100000px', left: '-100000px', opacity: 0, pointerEvents: 'none', visibility: 'hidden', whiteSpace: 'normal' }} className="lg-measure">
                {/* Dynamic maxWidth based on text length and screen size */}
                <div className="lg-measure-inner" style={{ display: 'inline-block', width: 'fit-content', maxWidth: 'min(90vw, 1100px)', textAlign: 'center', padding: '0.5rem 1rem', boxSizing: 'border-box' }}>
                    {measure ?? children}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative inline-block liquid-stack" style={{ width: `${containerWidth}px`, height: `${containerHeight}px`, transition: 'width 0.5s cubic-bezier(0.16, 1.5, 0.8, 1), height 0.6s cubic-bezier(0.20, 2.0, 0.50, 1)', willChange: 'width, height' }}>
            <LiquidGlass
                displacementScale={70}
                blurAmount={0.05}
                saturation={140}
                aberrationIntensity={6}
                elasticity={0.4}
                cornerRadius={60}
                mode="standard"
                mouseContainer={containerRef}
                globalMousePos={globalMousePos}
                mouseOffset={mouseOffset}
                width={containerWidth}
                height={containerHeight}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {/* Visual box: use dynamic maxWidth based on visual text content */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '0.5rem 1rem',
                    boxSizing: 'border-box',
                    width: visualBoxSize ? `${visualBoxSize.width}px` : 'fit-content',
                    height: visualBoxSize ? `${visualBoxSize.height}px` : undefined,
                    maxWidth: visualBoxSize ? undefined : (() => {
                        try {
                            const visualText = visual?.props?.children || children?.props?.children || '';
                            return getDynamicMaxWidth(visualText);
                        } catch {
                            return 'min(90vw, 1100px)';
                        }
                    })()
                }}>
                    {visual ?? children}
                </div>
            </LiquidGlass>

            <div aria-hidden ref={measureRef} style={{ position: 'fixed', top: '-100000px', left: '-100000px', opacity: 0, pointerEvents: 'none', visibility: 'hidden', whiteSpace: 'normal' }} className="lg-measure">
                <div className="lg-measure-inner" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'fit-content', maxWidth: 'min(90vw, 1100px)', textAlign: 'center', padding: '0.5rem 1rem', boxSizing: 'border-box' }}>
                    {measure ?? children}
                </div>
            </div>
        </div>
    );
}
