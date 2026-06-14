/** Parâmetros numéricos do catálogo — fração (0.15) vs percentual inteiro (15). */
const FRACTION_PARAM_KEYS = new Set([
  'stackBonusPerUse',
  'aoeDamageMultiplier',
  'copyPowerMultiplier',
]);

export function formatEffectParamPercent(
  value: number | undefined,
  paramKey: string,
  fallbackPercent = 0,
): number {
  const raw = value ?? (FRACTION_PARAM_KEYS.has(paramKey) ? fallbackPercent / 100 : fallbackPercent);
  if (FRACTION_PARAM_KEYS.has(paramKey)) {
    return Math.round(raw * 100);
  }
  return Math.round(raw);
}

export function formatEffectParamPercentLabel(
  value: number | undefined,
  paramKey: string,
  fallbackPercent = 0,
): string {
  return `${formatEffectParamPercent(value, paramKey, fallbackPercent)}%`;
}
