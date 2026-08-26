/**
 * Curva de XP de **domínio de moves**.
 * Personagem usa `characterXpCurve` — não misturar.
 *
 * Faixas (produto): barato até ~50 (moveset na frente do char),
 * médio 50–70, caro 70–85, muro 85–99 (endgame ~char 100 / move 82–87 no loadout).
 */

/** @deprecated Só para override explícito de `getRequiredXp(level, base, growth)`. */
export const PROGRESSION_XP_BASE = 100;

/** @deprecated Só para override explícito de `getRequiredXp(level, base, growth)`. */
export const PROGRESSION_XP_GROWTH = 1.15;

/** Move abaixo desta fração do nível do personagem recebe catch-up. */
export const DOMAIN_SYNC_RATIO_THRESHOLD = 0.8;

/** Multiplicador fixo de XP de domínio quando em descompasso. */
export const DOMAIN_CATCH_UP_MULTIPLIER = 1.5;

/**
 * XP de domínio para subir do `level` atual → `level + 1` (curva oficial).
 * Âncoras alvo (main move, loadout ~4): char 30≈50, char 50≈65, char 100≈85.
 */
export function resolveDomainRequiredXp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 10) {
    return 12 + safeLevel * 2;
  }
  if (safeLevel <= 25) {
    return 35 + (safeLevel - 11) * 3;
  }
  if (safeLevel <= 40) {
    return 90 + (safeLevel - 26) * 7;
  }
  if (safeLevel <= 50) {
    return 220 + (safeLevel - 41) * 16;
  }
  if (safeLevel <= 60) {
    return 700 + (safeLevel - 51) * 80;
  }
  if (safeLevel <= 70) {
    return 2000 + (safeLevel - 61) * 200;
  }
  if (safeLevel <= 80) {
    return 5500 + (safeLevel - 71) * 500;
  }
  if (safeLevel <= 85) {
    return 16000 + (safeLevel - 81) * 1400;
  }
  return 30000 + (safeLevel - 86) * 2800;
}

/**
 * Serviço de domínio de moves (e catch-up de sincronia).
 * Nível do personagem: `src/shared/character/characterXpCurve.ts`.
 */
export const CharacterProgressionService = {
  /**
   * XP de domínio para subir do `level` atual para `level + 1`.
   * Default = curva piecewise. Override `base`/`growth` = fórmula legada `base × growth^(n−1)`.
   */
  getRequiredXp(
    level: number,
    base: number = PROGRESSION_XP_BASE,
    growth: number = PROGRESSION_XP_GROWTH,
  ): number {
    const safeLevel = Math.max(1, Math.floor(level));
    if (base !== PROGRESSION_XP_BASE || growth !== PROGRESSION_XP_GROWTH) {
      return Math.floor(base * growth ** (safeLevel - 1));
    }
    return resolveDomainRequiredXp(safeLevel);
  },

  /**
   * Multiplicador de ganho de XP de domínio.
   * Se moveLevel/charLevel &lt; 0.8 → bônus catch-up de 50%.
   */
  getDomainXpMultiplier(charLevel: number, moveLevel: number): number {
    const char = Math.max(1, Math.floor(charLevel));
    const move = Math.max(1, Math.floor(moveLevel));
    const ratio = move / char;

    if (ratio < DOMAIN_SYNC_RATIO_THRESHOLD) {
      return DOMAIN_CATCH_UP_MULTIPLIER;
    }
    return 1.0;
  },
} as const;
