/** Carinho na HUD Pet Love — 1,5% de afinidade com cooldown de 1h. */
export const PET_AFFECTION_CONFIG = {
  cooldownMs: 60 * 60 * 1000,
  affinityReward: 0.015,
} as const;

export type PetAffectionAvailability = {
  readonly canAffect: boolean;
  readonly remainingMs: number;
};

export function resolvePetAffectionAvailability(
  lastAffectionAtMs: number | null,
  now = Date.now(),
): PetAffectionAvailability {
  if (lastAffectionAtMs === null || lastAffectionAtMs <= 0) {
    return { canAffect: true, remainingMs: 0 };
  }

  const elapsed = Math.max(0, now - lastAffectionAtMs);
  const remainingMs = Math.max(0, PET_AFFECTION_CONFIG.cooldownMs - elapsed);
  return {
    canAffect: remainingMs <= 0,
    remainingMs,
  };
}

/** Rótulo curto para cooldown — ex.: "42 min" ou "1h 05 min". */
export function formatPetAffectionCooldown(remainingMs: number): string {
  if (remainingMs <= 0) return '';

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${String(minutes).padStart(2, '0')} min` : `${hours}h`;
}
