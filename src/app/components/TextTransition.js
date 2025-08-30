'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LiquidGlassContainer from './LiquidGlassContainer';

export default function TextTransition() {
    const TEXTS = useMemo(() => [
        (
            <>
                <div className="text-4xl font-extrabold">Liquid glass</div>
                <div className="text-base mb-2">Demo with my take on this effect</div>
                <div className="font-extralight text-sm opacity-90">click anywhere to continue</div>
            </>
        ),
        (
            <>
                <div className="text-3xl font-semibold">I loved this effect</div>
                <div className="text-base mb-2">Since the very first day Apple showcased it — soft, glassy refraction with life.</div>
                <div className="font-extralight text-sm opacity-90">a personal note</div>
            </>
        ),
        (
            <>
                <div className="text-xl font-semibold">How it works</div>
                <div className="text-base mb-2">Built with liquid-glass-react: displacement, chromatic aberration, subtle blur and elasticity. The container auto-measures and we swap a measure node → visual node with synchronized fades to avoid layout jumps.</div>
                <div className="font-extralight text-sm opacity-90">technical summary</div>
            </>
        ),
        (
            <>
                <div className="text-2xl font-semibold">Short text</div>
            </>
        ),
        (
            <>
                <div className="text-lg font-semibold">A slightly longer line</div>
                <div className="text-base mb-2">A slightly longer line to show the container easing and fluid resizing.</div>
            </>
        ),
        (
            <>
                <div className="text-lg font-semibold">And let's start again...</div>
            </>
        )
    ], []);

    const TRANSITION_SPEED = 2; // Speed multiplier for transitions
    const FADE_MS = Math.round(500 / TRANSITION_SPEED);
    const CLICK_MIN_MS = 500; // Minimum delay between advances

    const [index, setIndex] = useState(0); // Text currently displayed
    const indexRef = useRef(index);
    const [phase, setPhase] = useState('idle'); // 'idle' | 'fadeOut' | 'fadeIn'
    const [visualText, setVisualText] = useState(TEXTS[0]);
    const [measureText, setMeasureText] = useState(TEXTS[0]);
    const [lastSize, setLastSize] = useState(null); // {width, height}
    const pendingSizeRef = useRef(null); // Holds latest measured size to apply at swap

    const fadeTimeoutRef = useRef(null);
    const lastAdvanceRef = useRef(0);

    // Kick off the automated switching
    useEffect(() => {
        // Keep a ref of the current index to avoid stale closure inside interval
        indexRef.current = index;
    }, [index]);

    // Click-to-advance (throttled)
    useEffect(() => {
        if (TEXTS.length < 2) return;

        const advance = () => {
            // enforce min delay and avoid re-entrancy while animating
            if (phase !== 'idle') return;
            const now = Date.now();
            if (now - lastAdvanceRef.current < CLICK_MIN_MS) return;
            lastAdvanceRef.current = now;

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

        const onClick = () => advance();
        const onTouchEnd = () => advance();

        window.addEventListener('click', onClick, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('click', onClick);
            window.removeEventListener('touchend', onTouchEnd);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [TEXTS.length, FADE_MS]);

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
        <h1 className="text-white" style={{ whiteSpace: 'pre-line', margin: 0, display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.2, transform: 'translateY(-0.06em)' }}>
            {typeof measureText === 'string' ? <span className="text-3xl font-medium" style={{ whiteSpace: 'pre-line' }}>{measureText}</span> : measureText}
        </h1>
    );

    // Visual node renders the current text with fade effect
    const visualNode = (
        <h1 className="text-white" style={{ ...visualStyle, whiteSpace: 'pre-line', display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.2, transform: 'translateY(-0.06em)' }}>
            {typeof visualText === 'string' ? <span className="text-3xl font-medium" style={{ whiteSpace: 'pre-line' }}>{visualText}</span> : visualText}
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