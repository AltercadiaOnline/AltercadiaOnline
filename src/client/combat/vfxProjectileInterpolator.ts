// @ts-nocheck
/** Ease-out cúbico — substituível por GSAP.to() sem alterar o manager. */
export function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}
/**
 * Interpola posição do projétil via rAF (API compatível com troca futura por GSAP).
 */
export function tweenProjectilePosition(element, from, to, options = {}) {
    const durationMs = options.durationMs ?? 280;
    const easing = options.easing ?? easeOutCubic;
    if (durationMs <= 0 || typeof requestAnimationFrame !== 'function') {
        element.style.left = `${to.x}px`;
        element.style.top = `${to.y}px`;
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const start = performance.now();
        const tick = (now) => {
            const raw = Math.min(1, (now - start) / durationMs);
            const t = easing(raw);
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            if (raw < 1) {
                requestAnimationFrame(tick);
                return;
            }
            resolve();
        };
        element.style.left = `${from.x}px`;
        element.style.top = `${to.y}px`;
        requestAnimationFrame(tick);
    });
}
