import { formatVolts } from '../../../shared/economy/premiumCurrency.js';

export type VoltsCounterTweenOptions = {
  readonly durationMs?: number;
  readonly onComplete?: () => void;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Anima o texto de VOLTS entre dois valores (ex.: 1200 → 1100). */
export function tweenVoltsCounter(
  element: HTMLElement,
  from: number,
  to: number,
  options: VoltsCounterTweenOptions = {},
): () => void {
  const durationMs = options.durationMs ?? 320;
  if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(from - to) < 0.005) {
    element.textContent = formatVolts(to);
    options.onComplete?.();
    return () => {};
  }

  let frameId = 0;
  const startedAt = performance.now();

  const tick = (now: number): void => {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / durationMs);
    const value = from + (to - from) * easeOutCubic(progress);
    element.textContent = formatVolts(value);

    if (progress >= 1) {
      element.textContent = formatVolts(to);
      options.onComplete?.();
      return;
    }

    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    if (frameId !== 0) cancelAnimationFrame(frameId);
  };
}
