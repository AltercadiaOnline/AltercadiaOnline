import { gsap } from 'gsap';

type VfxPosition = {
  readonly x: number;
  readonly y: number;
};

export type GsapProjectileTweenOptions = {
  readonly durationMs?: number;
  readonly ease?: string;
  readonly floatAmplitudePx?: number;
  readonly floatCycleMs?: number;
  readonly scalePeak?: number;
  readonly scaleCycleMs?: number;
};

/** Duração padrão do voo (3× a base original de 280ms). */
export const PROJECTILE_TRAVEL_DEFAULT_MS = 840;

const DEFAULT_FLOAT_AMPLITUDE_PX = 6;
const DEFAULT_FLOAT_CYCLE_MS = 450;
const DEFAULT_SCALE_PEAK = 1.1;
const DEFAULT_SCALE_CYCLE_MS = 350;
const DEFAULT_TRAVEL_EASE = 'sine.inOut';

function waitMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  const schedule = typeof globalThis.setTimeout === 'function'
    ? globalThis.setTimeout.bind(globalThis)
    : setTimeout;
  return new Promise((resolve) => {
    schedule(resolve, ms);
  });
}

function resetProjectileMotion(element: HTMLElement, to: VfxPosition): void {
  gsap.killTweensOf(element);
  element.style.left = `${to.x}px`;
  element.style.top = `${to.y}px`;
  element.style.transform = '';
}

/**
 * Voo cinematográfico: trajetória A→B com ease suave, flutuação senoidal em Y
 * e pulsação de escala enquanto viaja (browser). Fallback linear em Node/testes.
 */
export function tweenProjectileWithGsap(
  element: HTMLElement,
  from: VfxPosition,
  to: VfxPosition,
  options: GsapProjectileTweenOptions = {},
): Promise<void> {
  const durationMs = options.durationMs ?? PROJECTILE_TRAVEL_DEFAULT_MS;
  const durationSec = Math.max(0, durationMs) / 1000;
  const floatAmplitudePx = options.floatAmplitudePx ?? DEFAULT_FLOAT_AMPLITUDE_PX;
  const floatCycleSec = Math.max(0.08, (options.floatCycleMs ?? DEFAULT_FLOAT_CYCLE_MS) / 1000);
  const scalePeak = options.scalePeak ?? DEFAULT_SCALE_PEAK;
  const scaleCycleSec = Math.max(0.08, (options.scaleCycleMs ?? DEFAULT_SCALE_CYCLE_MS) / 1000);
  const travelEase = options.ease ?? DEFAULT_TRAVEL_EASE;

  element.style.left = `${from.x}px`;
  element.style.top = `${from.y}px`;

  if (durationSec <= 0) {
    resetProjectileMotion(element, to);
    return Promise.resolve();
  }

  if (typeof window === 'undefined') {
    return waitMs(durationMs).then(() => {
      resetProjectileMotion(element, to);
    });
  }

  element.style.transform = '';
  gsap.set(element, {
    xPercent: -50,
    yPercent: -50,
    x: 0,
    y: 0,
    scale: 1,
    transformOrigin: '50% 50%',
  });

  return new Promise((resolve) => {
    const finish = (): void => {
      resetProjectileMotion(element, to);
      resolve();
    };

    const timeline = gsap.timeline();

    timeline.to(element, {
      left: to.x,
      top: to.y,
      duration: durationSec,
      ease: travelEase,
      onComplete: finish,
    }, 0);

    // Loops decorativos — repeat finito; repeat:-1 impedia onComplete da timeline (deadlock na fila).
    const floatRepeats = Math.max(0, Math.ceil(durationSec / floatCycleSec) - 1);
    const scaleRepeats = Math.max(0, Math.ceil(durationSec / scaleCycleSec) - 1);

    if (floatRepeats > 0) {
      timeline.to(element, {
        y: floatAmplitudePx,
        duration: floatCycleSec,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: floatRepeats,
      }, 0);
    }

    if (scaleRepeats > 0) {
      timeline.to(element, {
        scale: scalePeak,
        duration: scaleCycleSec,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: scaleRepeats,
      }, 0);
    }
  });
}
