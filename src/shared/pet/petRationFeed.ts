/** Intervalo mínimo entre alimentações com Ração Especial (horário real). */
export const PET_RATION_FEED_COOLDOWN_MS = 30 * 60 * 1000;

export type PetRationFeedAvailability = {
  readonly canFeed: boolean;
  readonly remainingMs: number;
};

export function resolvePetRationFeedAvailability(
  lastFeedAtMs: number | null,
  now = Date.now(),
): PetRationFeedAvailability {
  if (lastFeedAtMs === null || lastFeedAtMs <= 0) {
    return { canFeed: true, remainingMs: 0 };
  }

  const elapsed = Math.max(0, now - lastFeedAtMs);
  const remainingMs = Math.max(0, PET_RATION_FEED_COOLDOWN_MS - elapsed);
  return {
    canFeed: remainingMs <= 0,
    remainingMs,
  };
}

/** Rótulo curto — ex.: "18 min" ou "1h 05 min". */
export function formatPetRationFeedCooldown(remainingMs: number): string {
  if (remainingMs <= 0) return '';

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${String(minutes).padStart(2, '0')} min` : `${hours}h`;
}
