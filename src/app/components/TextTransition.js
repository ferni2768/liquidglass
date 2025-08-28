'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LiquidGlassContainer from './LiquidGlassContainer';

export default function TextTransition() {
    const TEXTS = useMemo(() => [
        'Liquid Glass',
        'Is the best effect!!',
        'Big text to show it, this is a really really big text to show it'
    ], []);

    const INTERVAL_MS = 2000; // Interval between text changes
    const TRANSITION_SPEED = 2; // Speed multiplier for transitions
    const FADE_MS = Math.round(500 / TRANSITION_SPEED);

    const [index, setIndex] = useState(0); // Text currently displayed
    const indexRef = useRef(index);
    const [phase, setPhase] = useState('idle'); // 'idle' | 'fadeOut' | 'fadeIn'
    const [visualText, setVisualText] = useState(TEXTS[0]);
    const [measureText, setMeasureText] = useState(TEXTS[0]);
    const [lastSize, setLastSize] = useState(null); // {width, height}
    const pendingSizeRef = useRef(null); // Holds latest measured size to apply at swap

    const fadeTimeoutRef = useRef(null);
    const intervalRef = useRef(null);

    // Kick off the automated switching
    useEffect(() => {
        // Keep a ref of the current index to avoid stale closure inside interval
        indexRef.current = index;
    }, [index]);

    useEffect(() => {
        if (TEXTS.length < 2) return;

        const doTick = () => {
            const current = indexRef.current;
            const nextIndex = (current + 1) % TEXTS.length;
            const nextText = TEXTS[nextIndex];

            // Visual starts fading out now
            setPhase('fadeOut');

            // Align measure update to next frame to avoid flush-before-render glitches
            requestAnimationFrame(() => {
                // Functional text (measure) switches to the next
                setMeasureText(nextText);

                // After a full fade-out duration, swap visual text and fade in
                fadeTimeoutRef.current = setTimeout(() => {
                    // Apply the buffered measurement so the visual width updates exactly at swap
                    if (pendingSizeRef.current) {
                        setLastSize(pendingSizeRef.current);
                    }
                    setVisualText(nextText);
                    setPhase('fadeIn');

                    // After fade-in completes, set idle and advance index
                    fadeTimeoutRef.current = setTimeout(() => {
                        setPhase('idle');
                        setIndex(nextIndex);
                        indexRef.current = nextIndex;
                    }, FADE_MS);
                }, FADE_MS);
            });
        };

        // Schedule recurring ticks every INTERVAL_MS
        intervalRef.current = setInterval(doTick, INTERVAL_MS);

        // Initial tick after one interval (keeps initial display shown for INTERVAL_MS)
        const initialTimeout = setTimeout(doTick, INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
            clearTimeout(initialTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [TEXTS.length]);

    // Style for visual text fading
    const visualStyle = useMemo(() => ({
        transition: `opacity ${FADE_MS}ms ease`,
        willChange: 'opacity',
        opacity: phase === 'fadeOut' ? 0 : 1,
        whiteSpace: 'normal',
        margin: 0,
    }), [phase]);

    // Measurement node always renders the next/target text so container can resize first
    const measureNode = (
        <h1 className="text-white text-5xl font-bold" style={{ whiteSpace: 'normal', margin: 0, display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.2, transform: 'translateY(-0.06em)' }}>
            {measureText}
        </h1>
    );

    // Visual node renders the current text with fade effect
    const visualNode = (
        <h1 className="text-white text-5xl font-bold" style={{ ...visualStyle, display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.2, transform: 'translateY(-0.06em)' }}>
            {visualText}
        </h1>
    );

    return (
        <LiquidGlassContainer
            visual={visualNode}
            measure={measureNode}
            visualBoxSize={lastSize}
            phase={phase}
            onMeasure={(size) => {
                // Buffer the latest measured size; apply immediately only when idle (for responsive resizes)
                pendingSizeRef.current = size;
                if (phase === 'idle') {
                    setLastSize(size);
                }
            }}
        >
            {visualNode}
        </LiquidGlassContainer>
    );
}
