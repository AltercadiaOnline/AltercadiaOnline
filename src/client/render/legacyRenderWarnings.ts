const warned = new Set<string>();

/** Aviso único no console quando código legado de canvas ainda é invocado. */
export function warnLegacyRenderCall(symbol: string, replacement?: string): void {
  if (warned.has(symbol)) return;
  warned.add(symbol);
  const hint = replacement ? ` Use ${replacement} instead.` : '';
  console.warn(`[RenderAudit] Legacy render path "${symbol}" was called.${hint}`);
}
