/** Progressão harmonizada — mesma curva exponencial para personagem e domínio de moves. */

export const PROGRESSION_XP_BASE = 100;

export const PROGRESSION_XP_GROWTH = 1.15;

/** Move abaixo desta fração do nível do personagem recebe catch-up. */
export const DOMAIN_SYNC_RATIO_THRESHOLD = 0.8;

/** Multiplicador fixo de XP de domínio quando em descompasso. */
export const DOMAIN_CATCH_UP_MULTIPLIER = 1.5;

/**
 * Serviço de progressão harmonizada.
 * Fórmula exponencial atenuada compartilhada por nível do personagem e domínio de moves.
 */
export const CharacterProgressionService = {
  /**
   * XP necessário para subir do `level` atual para `level + 1`.
   * Fórmula: floor(base × growth^(level − 1))
   */
  getRequiredXp(level: number, base: number = PROGRESSION_XP_BASE, growth: number = PROGRESSION_XP_GROWTH): number {
    const safeLevel = Math.max(1, Math.floor(level));
    return Math.floor(base * growth ** (safeLevel - 1));
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
