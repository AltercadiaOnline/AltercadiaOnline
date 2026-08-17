/**
 * Escala de velocidade de exploração pelo nível (bonus cap em 60 — não é teto de XP).
 * Ease-out leve: sobe cedo e ainda ganha no 30–60 (o cúbico antigo platôava cedo).
 * L1 = 1.00×, L60 = +55%. Independente da Agilidade de combate.
 */

export const PLAYER_LEVEL_MAX = 60;

/** Teto de bônus vs nível 1 — dentro da faixa +50%…+60%. */
export const LEVEL_MOVE_SPEED_MAX_BONUS = 0.55;

export function clampPlayerLevel(playerLevel: number): number {
  if (!Number.isFinite(playerLevel)) return 1;
  return Math.max(1, Math.min(PLAYER_LEVEL_MAX, Math.floor(playerLevel)));
}

/**
 * Multiplicador de px/s de exploração. Independente do bônus de Agilidade do SET.
 *
 * `1 − (1 − t)^1.35` deixa ~30% do teto no 10, ~60% no 30 e o resto até o 60.
 */
export function resolveLevelMoveSpeedMultiplier(playerLevel: number): number {
  const level = clampPlayerLevel(playerLevel);
  if (level <= 1) return 1;

  const t = (level - 1) / (PLAYER_LEVEL_MAX - 1);
  const curve = 1 - (1 - t) ** 1.35;
  return 1 + LEVEL_MOVE_SPEED_MAX_BONUS * curve;
}
