/**
 * ATK/DEF de combate crescem com o nível — o piso.
 * O teto ainda vem do moveset (poder + domínio + combo).
 *
 * Classes com ATK de catálogo baixo (Cogitor 3, Tutator 2) usam um piso de
 * crescimento para o extra por nível — senão o 60 fica preso em ATK ~15
 * enquanto Impetus explode. A identidade da classe continua no baseline (nv 1).
 *
 * PvE: o golpe do jogador NÃO encolhe contra bicho mais forte.
 * Quem tanka é DEF + HP do monstro (ver monsterZoneScaling).
 */

export const PLAYER_ATK_GROWTH_PER_LEVEL = 0.07;
export const PLAYER_DEF_GROWTH_PER_LEVEL = 0.08;

/** Extra de ATK por nível aplica sobre max(ATK da classe, este piso). */
export const PLAYER_ATK_GROWTH_FLOOR = 8;
/** Extra de DEF por nível aplica sobre max(DEF da classe, este piso). */
export const PLAYER_DEF_GROWTH_FLOOR = 4;

function safeLevel(level: number | undefined | null): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) return 1;
  return Math.max(1, Math.floor(level));
}

function scaleClassStat(
  classStat: number,
  level: number,
  growth: number,
  growthFloor: number,
): number {
  const base = Math.max(0, Math.floor(classStat));
  const growthBase = Math.max(base, Math.max(0, Math.floor(growthFloor)));
  const extra = Math.floor(growthBase * (safeLevel(level) - 1) * growth);
  return base + extra;
}

export function resolvePlayerLevelAttack(classAttack: number, level: number | undefined | null): number {
  return scaleClassStat(classAttack, safeLevel(level), PLAYER_ATK_GROWTH_PER_LEVEL, PLAYER_ATK_GROWTH_FLOOR);
}

export function resolvePlayerLevelDefense(classDefense: number, level: number | undefined | null): number {
  return scaleClassStat(classDefense, safeLevel(level), PLAYER_DEF_GROWTH_PER_LEVEL, PLAYER_DEF_GROWTH_FLOOR);
}
