/** Utilitários puros — testáveis sem DOM. */
export type HpTier = 'high' | 'mid' | 'low';

export const GHOST_BAR_DELAY_MS = 420;
export const GHOST_BAR_DURATION_MS = 680;

export function computeVitalRatio(current: number, max: number): number {
  const safeMax = Math.max(1, max);
  const clamped = Math.max(0, current);
  return Math.min(100, (clamped / safeMax) * 100);
}

/** Verde >50%, amarelo >20%, vermelho ≤20%. */
export function resolveHpTier(ratio: number): HpTier {
  if (ratio > 50) return 'high';
  if (ratio > 20) return 'mid';
  return 'low';
}

export function formatVitalLabel(current: number, max: number): string {
  const safeMax = Math.max(1, max);
  return `${Math.max(0, Math.ceil(current))}/${Math.ceil(safeMax)}`;
}

export type FloatingHudVitalProps = {
  readonly current: number;
  readonly max: number;
};

export type FloatingHudProps = {
  readonly hp: FloatingHudVitalProps;
  readonly pp: FloatingHudVitalProps;
};

export type VitalKind = 'hp' | 'pp';

export type VitalBarElements = {
  row: HTMLElement;
  track: HTMLElement;
  ghost: HTMLElement;
  fill: HTMLElement;
  value: HTMLElement;
};

export type VitalBarState = {
  lastRatio: number;
  ghostTimer: ReturnType<typeof setTimeout> | null;
};
