/** HP base do jogador — mesma referência do motor de combate (sem bônus de equipamento/marcos). */
export const BASE_PLAYER_HP = 100;

export function computePlayerHpMax(maxHpBonusPercent = 0): number {
  return Math.max(1, Math.floor(BASE_PLAYER_HP * (1 + maxHpBonusPercent / 100)));
}

export function clampPlayerHpCurrent(hpCurrent: number, hpMax: number): number {
  return Math.max(0, Math.min(hpMax, Math.floor(hpCurrent)));
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
    // Legado: HUD antiga subia só o teto (100/112) — preenche o buff se o atual ficou na base.
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
