// Utilities to read the dynamic visual viewport (accounts for mobile URL bars)
// Returns dimensions in CSS pixels and convenient dv units (pixels per 1dvw/1dvh/1dvmin/1dvmax)

export function getViewport() {
    if (typeof window === 'undefined') {
        // SSR safe defaults
        return { width: 0, height: 0, dvw: 0, dvh: 0, dvmin: 0, dvmax: 0 };
    }
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = vv?.height ?? window.innerHeight;
    const dvw = width / 100;
    const dvh = height / 100;
    const dvmin = Math.min(dvw, dvh);
    const dvmax = Math.max(dvw, dvh);
    return { width, height, dvw, dvh, dvmin, dvmax };
}

// Subscribe to dynamic viewport changes; calls cb on resize/scroll of visualViewport and window resize
export function listenViewport(cb) {
    if (typeof window === 'undefined') return () => { };
    const vv = window.visualViewport;
    const handler = () => {
        try { cb(); } catch { }
    };
    window.addEventListener('resize', handler, { passive: true });
    if (vv) {
        vv.addEventListener('resize', handler, { passive: true });
        vv.addEventListener('scroll', handler, { passive: true });
    }
    return () => {
        window.removeEventListener('resize', handler);
        if (vv) {
            vv.removeEventListener('resize', handler);
            vv.removeEventListener('scroll', handler);
        }
    };
}

