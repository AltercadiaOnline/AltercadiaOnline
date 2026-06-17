import type { PlayerWorldVitals } from '../character/equipmentState.js';
import { clampPlayerHpCurrent } from '../character/playerVitals.js';

function clampMpCurrent(mpCurrent: number, mpMax: number): number {
  return Math.max(0, Math.min(mpMax, Math.floor(mpCurrent)));
}

function sanitizeVitals(vitals: PlayerWorldVitals): PlayerWorldVitals | null {
  const { hpCurrent, hpMax, mpCurrent, mpMax } = vitals;
  if (
    !Number.isFinite(hpCurrent)
    || !Number.isFinite(hpMax)
    || !Number.isFinite(mpCurrent)
    || !Number.isFinite(mpMax)
    || hpMax < 1
    || mpMax < 1
  ) {
    return null;
  }

  const safeHpMax = Math.max(1, Math.floor(hpMax));
  const safeMpMax = Math.max(1, Math.floor(mpMax));
  return {
    hpMax: safeHpMax,
    mpMax: safeMpMax,
    hpCurrent: clampPlayerHpCurrent(hpCurrent, safeHpMax),
    mpCurrent: clampMpCurrent(mpCurrent, safeMpMax),
  };
}

/** Vitals autoritativos do servidor — sem espelho do cliente (anti-cheat). */
export function sanitizeAuthoritativeWorldVitals(
  vitals: PlayerWorldVitals,
): PlayerWorldVitals | null {
  return sanitizeVitals(vitals);
}
