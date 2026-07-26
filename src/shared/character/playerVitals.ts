/** HP base do jogador no nível 1 — mesma referência do motor de combate (sem bônus de equipamento/marcos). */
export const BASE_PLAYER_HP = 100;

/** Vida flat ganha por nível acima de 1 (nível 12 → +110 HP antes de buffs %). */
export const PLAYER_HP_PER_LEVEL = 10;

export function resolvePlayerBaseHpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return BASE_PLAYER_HP + (safeLevel - 1) * PLAYER_HP_PER_LEVEL;
}

export function computePlayerHpMax(level = 1, maxHpBonusPercent = 0): number {
  const base = resolvePlayerBaseHpForLevel(level);
  return Math.max(1, Math.floor(base * (1 + maxHpBonusPercent / 100)));
}

export function clampPlayerHpCurrent(hpCurrent: number, hpMax: number): number {
  return Math.max(0, Math.min(hpMax, Math.floor(hpCurrent)));
}

/** HP ao respawnar na cidade após derrota PVE (~10% do máximo, mínimo 1). */
export const DEFEAT_RESPAWN_HP_RATIO = 0.1;

export function resolveDefeatRespawnHpCurrent(hpMax: number): number {
  const max = Math.max(1, Math.floor(hpMax));
  return Math.max(1, Math.floor(max * DEFEAT_RESPAWN_HP_RATIO));
}

/**
 * Ajusta HP atual quando o teto muda (buff/equip de vida %).
 * Ganho de teto: soma o delta no atual (100/100 +12 → 112/112).
 * Perda de teto: só clamp no novo máximo.
 */
export function applyPlayerHpMaxChange(
  hpCurrent: number,
  previousHpMax: number,
  nextHpMax: number,
): number {
  const prevMax = Math.max(1, Math.floor(previousHpMax));
  const nextMax = Math.max(1, Math.floor(nextHpMax));
  const current = Math.floor(hpCurrent);

  if (nextMax === prevMax) {
    const levelBase = resolvePlayerBaseHpForLevel(1);
    if (current === levelBase && nextMax > levelBase) {
      return nextMax;
    }
    if (current === BASE_PLAYER_HP && nextMax > BASE_PLAYER_HP) {
      return nextMax;
    }
    return clampPlayerHpCurrent(current, nextMax);
  }

  if (nextMax > prevMax) {
    return clampPlayerHpCurrent(current + (nextMax - prevMax), nextMax);
  }

  return clampPlayerHpCurrent(current, nextMax);
}
