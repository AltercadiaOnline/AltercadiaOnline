/**
 * Compact display for large numbers (1k, 20k, 1.5M).
 * Values under 1k keep fractional precision only when needed.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${sign}${formatScaled(abs, 1_000_000, 'M')}`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatScaled(abs, 1_000, 'k')}`;
  }

  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function formatScaled(value: number, divisor: number, suffix: string): string {
  const scaled = (value / divisor).toFixed(1);
  if (scaled.endsWith('.0')) {
    return `${scaled.slice(0, -2)}${suffix}`;
  }
  return `${scaled}${suffix}`;
}
