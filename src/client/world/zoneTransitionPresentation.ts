import {
  forceHideZoneTransitionOverlay,
  hideZoneTransitionOverlay,
  showZoneTransitionOverlay,
  ZONE_TRANSITION_FADE_MS,
} from './zoneTransitionOverlay.js';

export { ZONE_TRANSITION_FADE_MS };
const MIN_HOLD_MS = 120;

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fade curto → troca de mapa no meio → fade out.
 * Mantém a troca rápida quando o ZoneLink já está aquecido.
 */
export async function presentZoneTransition(
  label: string,
  applySwap: () => void,
): Promise<void> {
  showZoneTransitionOverlay(label, { replace: true });
  await waitMs(ZONE_TRANSITION_FADE_MS);

  applySwap();
  await waitMs(MIN_HOLD_MS);

  hideZoneTransitionOverlay();
  await waitMs(ZONE_TRANSITION_FADE_MS);
}

export function abortZoneTransitionPresentation(): void {
  forceHideZoneTransitionOverlay();
}
