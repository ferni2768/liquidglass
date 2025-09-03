'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { getViewport, listenViewport } from '../../lib/viewport';
import LiquidGlass from 'liquid-glass-react';

export default function LiquidGlassContainer({ children, visual, measure, onMeasure, visualBoxSize, phase, balanced = true }) {
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef(null);
    const measureRef = useRef(null);
    const [cornerRadius, setCornerRadius] = useState(120);

    // Mouse-driven positions to feed into LiquidGlass
    const [globalMousePos, setGlobalMousePos] = useState({ x: 0, y: 0 });
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

    const [containerWidth, setContainerWidth] = useState(400);
    const [containerHeight, setContainerHeight] = useState(120);

    const [, setMeasuredSize] = useState({ width: 0, height: 0 });
    const autoSizeFromText = true;
    const [measuredDone, setMeasuredDone] = useState(false);

    useEffect(() => setIsClient(true), []);

    // Compute a dynamic max width based on text length and screen size (dv units)
    const getDynamicMaxWidth = (text) => {
        if (typeof window === 'undefined') return '80dvw';
        const length = text?.length || 0;
        const { width: vw } = getViewport();

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

        // Express preferred width in dvw and cap by dvmin; allow up to 90vw as an absolute upper bound
        const preferredPct = Math.round(factor * 100);
        return `min(90vw, ${preferredPct}dvw, 120dvmin)`;
    };

    // Corner radius derived from dvmin for consistent rounding across devices
    useEffect(() => {
        const updateCorner = () => {
            if (typeof window === 'undefined') return;
            const { dvmin } = getViewport();
            const dvminPx = dvmin;
            const r = Math.round(12 * dvminPx); // 12dvmin
            setCornerRadius(Math.max(12, r));
        };
        updateCorner();
        const unsub = listenViewport(updateCorner);
        return () => unsub();
    }, []);

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

                if (balanced && lastLine.width < avgLineWidth * shortThreshold) {
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
            const dynamicMaxWidth = balanced ? getDynamicMaxWidth(textContent) : 'min(90vw, 120dvmin)';

            // Avoids wrap/drift caused by cascade differences or transforms
            try {
                const visualEl = containerRef.current?.querySelector('.lg-visual');
                if (visualEl) {
                    const vs = window.getComputedStyle(visualEl);
                    const textProps = [
                        'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'word-spacing',
                        'text-transform', 'text-rendering', 'font-variant', 'white-space', 'word-break', 'line-height'
                    ];
                    for (const p of textProps) {
                        try {
                            const val = vs.getPropertyValue(p);
                            if (val) target.style.setProperty(p, val, 'important');
                        } catch { }
                    }
                }
            } catch { }

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

        // If fonts load after initial render, text metrics can change; re-measure on readiness
        if (document?.fonts) {
            try {
                document.fonts.ready.then(() => scheduleMeasure());
                document.fonts.addEventListener?.('loadingdone', scheduleMeasure, { passive: true });
            } catch { /* noop */ }
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
            if (document?.fonts && document.fonts.removeEventListener) {
                try { document.fonts.removeEventListener('loadingdone', scheduleMeasure); } catch { }
            }
        };
    }, [measure, isClient, measuredDone, onMeasure, visualBoxSize, phase]);

    // Track whether the pointer (mouse or active touch) is considered "inside" the window
    const [pointerActive, setPointerActive] = useState(true);

    // Animated elasticity: interpolate from defaultElasticity -> 0 when pointer leaves, to provide a smooth visual
    const defaultElasticity = 0.35;
    const [animatedElasticity, setAnimatedElasticity] = useState(defaultElasticity);
    const animRef = useRef({ rafId: null, startTime: 0, duration: 600, fromOffset: { x: 0, y: 0 }, fromGlobal: { x: 0, y: 0 }, fromElasticity: defaultElasticity });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let rafId = null;
        const detectionRadius = 100;

        function onMove(e) {
            const cx = e.clientX;
            const cy = e.clientY;

            // Any move indicates the pointer is active/inside
            setPointerActive(true);
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

        // When mouse leaves the window, many browsers fire a mouseout on window with relatedTarget === null
        function onWindowMouseOut(e) {
            try {
                if (!e || e.relatedTarget === null) {
                    // Consider pointer inactive / far away
                    setPointerActive(false);
                }
            } catch { }
        }

        // Touch handlers: start/active = true, end/cancel = false
        function onTouchStart(e) {
            setPointerActive(true);
            if (e.touches && e.touches[0]) onMove(e.touches[0]);
        }
        function onTouchMove(e) {
            if (e.touches && e.touches[0]) onMove(e.touches[0]);
        }
        function onTouchEnd() {
            setPointerActive(false);
        }

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseout', onWindowMouseOut, { passive: true });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseout', onWindowMouseOut);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    // When pointerActive changes, animate mouseOffset/globalMousePos toward neutral and ease elasticity to 0.
    useEffect(() => {
        // Cancel any existing animation
        if (animRef.current.rafId) {
            cancelAnimationFrame(animRef.current.rafId);
            animRef.current.rafId = null;
        }

        // If pointer became active, snap elasticity back to default and stop animating
        if (pointerActive) {
            setAnimatedElasticity(defaultElasticity);
            return;
        }

        // Pointer inactive -> animate to neutral (centered) over duration
        const duration = animRef.current.duration || 600;
        const start = performance.now();

        // Capture starting values
        animRef.current.startTime = start;
        animRef.current.fromOffset = { ...mouseOffset };
        animRef.current.fromGlobal = { ...globalMousePos };
        animRef.current.fromElasticity = animatedElasticity;

        // Compute target global position as container center (or window center fallback)
        let targetGlobal = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        try {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                targetGlobal = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
        } catch { }

        const fromOff = animRef.current.fromOffset;
        const fromGlobal = animRef.current.fromGlobal;
        const fromElastic = animRef.current.fromElasticity;

        // Easing function (easeOutCubic)
        const ease = (t) => 1 - Math.pow(1 - t, 3);

        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const e = ease(t);

            // Interpolate offset toward zero
            const nx = fromOff.x + (0 - fromOff.x) * e;
            const ny = fromOff.y + (0 - fromOff.y) * e;
            setMouseOffset({ x: nx, y: ny });

            // Interpolate global pos toward targetGlobal
            const gx = fromGlobal.x + (targetGlobal.x - fromGlobal.x) * e;
            const gy = fromGlobal.y + (targetGlobal.y - fromGlobal.y) * e;
            setGlobalMousePos({ x: gx, y: gy });

            // Interpolate elasticity toward 0
            const elastic = fromElastic + (0 - fromElastic) * e;
            setAnimatedElasticity(elastic);

            if (t < 1) {
                animRef.current.rafId = requestAnimationFrame(step);
            } else {
                animRef.current.rafId = null;
                setMouseOffset({ x: 0, y: 0 });
                setGlobalMousePos(targetGlobal);
                setAnimatedElasticity(0);
            }
        }

        animRef.current.rafId = requestAnimationFrame(step);

        return () => {
            if (animRef.current.rafId) {
                cancelAnimationFrame(animRef.current.rafId);
                animRef.current.rafId = null;
            }
        };
    }, [pointerActive]);

    if (!isClient) return <div className="p-[2dvmin] bg-white/10 backdrop-blur-sm rounded-[12dvmin]">{children}</div>;

    if (autoSizeFromText && !measuredDone) {
        return (
            <div aria-hidden ref={measureRef} style={{ position: 'fixed', top: '-100000px', left: '-100000px', opacity: 0, pointerEvents: 'none', visibility: 'hidden', whiteSpace: 'normal' }} className="lg-measure">
                {/* Dynamic maxWidth based on text length and screen size (dv units) */}
                <div className="lg-measure-inner" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'fit-content', maxWidth: balanced ? 'min(90vw, 120dvmin)' : 'min(90vw, 120dvmin)', textAlign: 'center', padding: 'var(--lg-padding)', boxSizing: 'border-box' }}>
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
                elasticity={animatedElasticity}
                cornerRadius={cornerRadius}
                mode="standard"
                mouseContainer={containerRef}
                globalMousePos={globalMousePos}
                mouseOffset={mouseOffset}
                width={containerWidth}
                height={containerHeight}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {/* Visual box: force exact measured size to ensure identical wrapping */}
                <div className="lg-visual" style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    padding: 'var(--lg-padding)',
                    boxSizing: 'border-box',
                    minWidth: 0,
                    width: visualBoxSize?.width ? `${visualBoxSize.width}px` : 'fit-content',
                    height: visualBoxSize?.height ? `${visualBoxSize.height}px` : 'auto',
                    maxWidth: visualBoxSize?.width ? `${visualBoxSize.width}px` : undefined,
                    transform: 'none',
                    position: 'relative',
                }}>
                    {visual ?? children}
                </div>
            </LiquidGlass>

            <div aria-hidden ref={measureRef} style={{ position: 'fixed', top: '-100000px', left: '-100000px', opacity: 0, pointerEvents: 'none', visibility: 'hidden', whiteSpace: 'normal' }} className="lg-measure">
                <div className="lg-measure-inner" style={{ display: 'inline-block', whiteSpace: 'pre-line', alignItems: 'center', justifyContent: 'center', width: 'fit-content', maxWidth: balanced ? 'min(90vw, 120dvmin)' : 'min(90vw, 120dvmin)', textAlign: 'center', padding: 'var(--lg-padding)', boxSizing: 'border-box' }}>
                    {measure ?? children}
                </div>
            </div>
        </div>
    );
}
