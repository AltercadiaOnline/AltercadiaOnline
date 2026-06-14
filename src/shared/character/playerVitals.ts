/** HP base do jogador — mesma referência do motor de combate (sem bônus de equipamento/marcos). */
export const BASE_PLAYER_HP = 100;

export function computePlayerHpMax(maxHpBonusPercent = 0): number {
  return Math.max(1, Math.floor(BASE_PLAYER_HP * (1 + maxHpBonusPercent / 100)));
}

export function clampPlayerHpCurrent(hpCurrent: number, hpMax: number): number {
  return Math.max(0, Math.min(hpMax, Math.floor(hpCurrent)));
}
