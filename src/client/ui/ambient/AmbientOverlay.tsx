/**
 * Atmosfera dinâmica — overlay fixo; espelha gameTime interpolado do servidor.
 */
import { resolveAmbientOverlay } from '../../../shared/world/gameTime.js';
import { getGameTimeStore } from '../../world/gameTimeStore.js';

const OVERLAY_ID = 'ambient-overlay';

export type AmbientOverlayHandle = {
  readonly destroy: () => void;
};

function applyAmbientStyle(element: HTMLElement, gameTimeSeconds: number): void {
  const style = resolveAmbientOverlay(gameTimeSeconds);
  element.style.opacity = String(style.opacity);
  element.style.backgroundColor = style.backgroundColor;
  element.style.filter = style.filter;
}

export function mountAmbientOverlay(): AmbientOverlayHandle {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'ambient-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }

  const element = overlay;
  const store = getGameTimeStore();

  applyAmbientStyle(element, store.getInterpolatedGameTime());

  const unsubscribe = store.subscribe((seconds) => {
    applyAmbientStyle(element, seconds);
  });

  let rafId = 0;
  const tick = (): void => {
    applyAmbientStyle(element, store.getInterpolatedGameTime());
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    destroy: () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
      element.remove();
    },
  };
}
