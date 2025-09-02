'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LiquidGlassContainer from './LiquidGlassContainer';

export default function TextTransition() {
    const TEXTS = useMemo(() => [
        {
            balanced: false,
            content: (
                <>
                    <div className="font-extrabold mb-[0.75dvmin]" style={{ fontSize: '10dvmin', lineHeight: 1.02 }}>Liquid Glass</div>
                    <div className="mb-[1.5dvmin]" style={{ fontSize: '5dvmin', lineHeight: 1.15 }}>Demo with my take on this effect</div>
                    <div className="font-extralight opacity-70" style={{ fontSize: '4dvmin', lineHeight: 1.1 }}>click anywhere to continue</div>
                </>
            )
        },
        {
            content: (
                <>
                    <div className="font-semibold opacity-80 px-[1.25dvmin] mb-[1.5dvmin]" style={{ fontSize: '4dvmin', lineHeight: 1.05 }}>Apple introduced Liquid Glass in iOS 26</div>
                    <div className="" style={{ fontSize: '8dvmin', lineHeight: 0.9 }}>It features 3 main effects:</div>
                </>
            )
        },
        {
            balanced: false,
            content: (
                <>
                    <div className="font-extrabold opacity-90 pulse-blur" style={{ fontSize: '10dvmin', lineHeight: 1.15 }}>
                        BLUR
                    </div>

                    <div className="font-bold refraction" style={{ fontSize: '10dvmin', lineHeight: 1.15, color: 'white', position: 'relative', opacity: 0.85 }}>
                        REFRACTION

                        <svg style={{ position: "absolute", width: 0, height: 0 }}>
                            <filter id="refractionFilter">
                                <feTurbulence type="fractalNoise" baseFrequency="0.001 0.001" numOctaves="5" seed="2" result="turb">
                                    <animate attributeName="baseFrequency" dur="15s" values="0.006 0.01; 0.009 0.014; 0.007 0.012; 0.010 0.016; 0.006 0.01" repeatCount="indefinite" />
                                </feTurbulence>

                                <feDisplacementMap in="SourceGraphic" in2="turb" scale="12" xChannelSelector="R" yChannelSelector="G" />
                            </filter>
                        </svg>
                    </div>

                    <div className="font-extrabold opacity-90" style={{ fontSize: '10dvmin', lineHeight: 1.15 }}>
                        <div className="chromatic-aberration pb-[3dvmin]" data-text="ABERRATION">
                            ABERRATION
                        </div>
                    </div>

                    <div className="font-extralight opacity-70" style={{ fontSize: '4dvmin', lineHeight: 1.1 }}>Along with secondary effects...</div>
                </>
            )
        },
        {
            balanced: false,
            content: (
                <>
                    <div className="opacity-80" style={{ fontSize: '4dvmin', lineHeight: 1.05 }}>Also!</div>
                    <div className="font-bold" style={{ fontSize: '6dvmin', lineHeight: 1.15 }}>This is elastic</div>
                    <div className="font-light opacity-70" style={{ fontSize: '4dvmin', lineHeight: 1.1 }}>Hover to try</div>
                </>
            )
        },
        {
            content: (
                <>
                    <div className="font-semibold" style={{ fontSize: '6dvmin', lineHeight: 1.08 }}>Animations are smooth</div>
                    <div className="font-semibold mb-[20dvmin]" style={{ fontSize: '6dvmin', lineHeight: 1.08 }}>Being able to transform from this</div>
                    <div className="font-extralight opacity-70" style={{ fontSize: '4dvmin', lineHeight: 1.1 }}>(looong text)</div>
                </>
            )
        },
        {
            balanced: false,
            content: (
                <>
                    <div className="font-semibold" style={{ fontSize: '6dvmin', lineHeight: 1.08 }}>To this</div>
                    <div className="font-extralight opacity-70" style={{ fontSize: '4dvmin', lineHeight: 1.1 }}>(short text)</div>
                </>
            )
        },
        {
            balanced: false,
            content: (
                <>
                    <div className="font-semibold" style={{ fontSize: '5.5dvmin', lineHeight: 1.08 }}>Hope you found this interesting!</div>
                    <div className="opacity-70">
                        <a
                            href="https://github.com/ferni2768/liquidglass"
                            className="underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '4.25dvmin', lineHeight: 1.08 }}
                        >
                            Here is my code
                        </a>
                    </div>
                </>
            )
        },
        {
            balanced: false,
            content: (
                <>
                    <div className="font-semibold" style={{ fontSize: '7dvmin', lineHeight: 1.08 }}>Let's start again...</div>
                </>
            )
        }
    ], []);

    const TRANSITION_SPEED = 2; // Speed multiplier for transitions
    const FADE_MS = Math.round(500 / TRANSITION_SPEED);
    const CLICK_MIN_MS = 500; // Minimum delay between advances

    const [index, setIndex] = useState(0); // Text currently displayed
    const indexRef = useRef(index);
    const [phase, setPhase] = useState('idle'); // 'idle' | 'fadeOut' | 'fadeIn'
    const [visualText, setVisualText] = useState(TEXTS[0].content);
    const [measureText, setMeasureText] = useState(TEXTS[0].content);
    const [balanced, setBalanced] = useState(TEXTS[0].balanced !== undefined ? TEXTS[0].balanced : true);
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
            const nextItem = TEXTS[nextIndex];

            // Visual starts fading out now
            setPhase('fadeOut');

            // Align measure update to next frame to avoid flush-before-render glitches
            requestAnimationFrame(() => {
                // Functional text (measure) switches to the next
                setMeasureText(nextItem.content);
                setBalanced(nextItem.balanced !== undefined ? nextItem.balanced : true);

                // After a full fade-out duration, swap visual text and fade in
                fadeTimeoutRef.current = setTimeout(() => {
                    // Apply the buffered measurement so the visual width updates exactly at swap
                    if (pendingSizeRef.current) {
                        setLastSize(pendingSizeRef.current);
                    }
                    setVisualText(nextItem.content);
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
        <h1 className="text-white" style={{ whiteSpace: 'pre-line', margin: 0, display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.12, transform: 'translateY(-0.06em)' }}>
            {typeof measureText === 'string' ? <span className="font-medium" style={{ whiteSpace: 'pre-line', fontSize: '7.5dvmin' }}>{measureText}</span> : measureText}
        </h1>
    );

    // Visual node renders the current text with fade effect
    const visualNode = (
        <h1 className="text-white" style={{ ...visualStyle, whiteSpace: 'pre-line', display: 'inline-block', wordBreak: 'break-word', lineHeight: 1.12, transform: 'translateY(-0.06em)' }}>
            {typeof visualText === 'string' ? <span className="font-medium" style={{ whiteSpace: 'pre-line', fontSize: '7.5dvmin' }}>{visualText}</span> : visualText}
        </h1>
    );

    return (
        <LiquidGlassContainer
            visual={visualNode}
            measure={measureNode}
            visualBoxSize={lastSize}
            phase={phase}
            balanced={balanced}
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