'use client';

import { useEffect, useRef } from 'react';
import { getViewport, listenViewport } from '../../lib/viewport';
import { createNoise3D } from 'simplex-noise';

const { PI, cos, sin, abs } = Math;
const TAU = 2 * PI;
const rand = (n) => n * Math.random();
const randRange = (n) => n - rand(2 * n);
const fadeInOut = (t, m) => {
    const hm = 0.5 * m;
    return abs(((t + hm) % m) - hm) / hm;
};
const lerp = (n1, n2, speed) => (1 - speed) * n1 + speed * n2;


export default function SwirlBackground() {
    const outer = useRef(null);
    const topCanvas = useRef(null);
    const bottomCanvas = useRef(null);
    const frameRef = useRef(null);

    useEffect(() => {
        // Configuration
        const COUNT = 700;
        const PER = 9;
        const LEN = COUNT * PER;
        const Y_R = 100;
        const TTL0 = 50, TTL_R = 150;
        const S0 = 0.1, S_R = 2;
        const R0 = 1, R_R = 4;
        const H0 = 220, H_R = 100;
        const NOISE_STEPS = 8;
        const XOFF = 0.00125, YOFF = 0.00125, ZOFF = 0.0005;
        const BG = 'hsla(260,40%,5%,0.4)';

        const canvasA = topCanvas.current;
        const canvasB = bottomCanvas.current;
        const gA = canvasA.getContext('2d');
        const gB = canvasB.getContext('2d');

        const centerPt = { x: 0, y: 0 };

        // Packed particle store
        const store = new Float32Array(LEN);
        let tick = 0;
        const noise3D = createNoise3D();

        function resizeAll() {
            const { width: w, height: h } = getViewport();
            canvasA.width = w; canvasA.height = h;
            // Preserve content between buffers
            gA.drawImage(canvasB, 0, 0);
            canvasB.width = w; canvasB.height = h;
            gB.drawImage(canvasA, 0, 0);
            centerPt.x = w * 0.5; centerPt.y = h * 0.5;
        }

        function seedParticle(idx) {
            const x = rand(canvasA.width);
            const y = centerPt.y + randRange(Y_R);
            const vx = 0, vy = 0, life = 0;
            const ttl = TTL0 + rand(TTL_R);
            const spd = S0 + rand(S_R);
            const rad = R0 + rand(R_R);
            const hue = H0 + rand(H_R);
            store.set([x, y, vx, vy, life, ttl, spd, rad, hue], idx);
        }

        function initAll() {
            tick = 0;
            for (let i = 0; i < LEN; i += PER) seedParticle(i);
        }

        function outOfBounds(x, y) {
            return x > canvasA.width || x < 0 || y > canvasA.height || y < 0;
        }

        function renderStroke(x1, y1, x2, y2, life, ttl, radius, hue) {
            gA.save();
            gA.lineCap = 'round';
            gA.lineWidth = radius;
            gA.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
            gA.beginPath();
            gA.moveTo(x1, y1);
            gA.lineTo(x2, y2);
            gA.stroke();
            gA.closePath();
            gA.restore();
        }

        function evolve(i) {
            const i1 = i + 1, i2 = i + 2, i3 = i + 3, i4 = i + 4, i5 = i + 5, i6 = i + 6, i7 = i + 7, i8 = i + 8;
            const x = store[i], y = store[i1];
            const n = noise3D(x * XOFF, y * YOFF, tick * ZOFF) * NOISE_STEPS * TAU;
            const vx = lerp(store[i2], cos(n), 0.5);
            const vy = lerp(store[i3], sin(n), 0.5);
            const life = store[i4];
            const ttl = store[i5];
            const spd = store[i6];
            const x2 = x + vx * spd;
            const y2 = y + vy * spd;
            const rad = store[i7];
            const hue = store[i8];

            renderStroke(x, y, x2, y2, life, ttl, rad, hue);

            const lifeN = life + 1;
            store[i] = x2; store[i1] = y2; store[i2] = vx; store[i3] = vy; store[i4] = lifeN;

            if (outOfBounds(x, y) || lifeN > ttl) seedParticle(i);
        }

        function stepAll() {
            for (let i = 0; i < LEN; i += PER) evolve(i);
        }

        function bloom() {
            gB.save(); gB.filter = 'blur(8px) brightness(200%)'; gB.globalCompositeOperation = 'lighter'; gB.drawImage(canvasA, 0, 0); gB.restore();
            gB.save(); gB.filter = 'blur(4px) brightness(200%)'; gB.globalCompositeOperation = 'lighter'; gB.drawImage(canvasA, 0, 0); gB.restore();
        }

        function composite() {
            gB.save(); gB.globalCompositeOperation = 'lighter'; gB.drawImage(canvasA, 0, 0); gB.restore();
        }

        function tickFrame() {
            tick++;
            gA.clearRect(0, 0, canvasA.width, canvasA.height);
            gB.fillStyle = BG; gB.fillRect(0, 0, canvasA.width, canvasA.height);
            stepAll();
            bloom();
            composite();
            frameRef.current = requestAnimationFrame(tickFrame);
        }

        function boot() { resizeAll(); initAll(); tickFrame(); }

        const onResize = () => resizeAll();
        const unsub = listenViewport(onResize);
        boot();

        return () => {
            unsub();
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return (
        <div ref={outer} className="fixed inset-0 z-0 content--canvas pointer-events-none">
            <canvas ref={bottomCanvas} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />
            <canvas ref={topCanvas} style={{ display: 'none' }} />
        </div>
    );
}
