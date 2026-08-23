/**
 * ATK/DEF de combate: baseline da classe (nv. 1).
 * Crescimento por nível saiu — a bolsa da Ficha (pontos gastos) é a progressão.
 * PvE: DEF + HP do monstro tankam (ver monsterZoneScaling).
 */

function safeClassStat(classStat: number): number {
  if (typeof classStat !== 'number' || !Number.isFinite(classStat)) return 0;
  return Math.max(0, Math.floor(classStat));
}

/** @deprecated Nível não escala ATK — mantido como identidade da classe. */
export function resolvePlayerLevelAttack(
  classAttack: number,
  _level?: number | null,
): number {
  return safeClassStat(classAttack);
}

/** @deprecated Nível não escala DEF — mantido como identidade da classe. */
export function resolvePlayerLevelDefense(
  classDefense: number,
  _level?: number | null,
): number {
  return safeClassStat(classDefense);
}
