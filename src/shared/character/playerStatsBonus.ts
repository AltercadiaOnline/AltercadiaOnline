import type { EquipmentUiGridState } from './equipmentUiSlots.js';
import { getAuthoritativeItemById } from '../items/itemCatalogAuthoritative.js';
import { calculateTotalStats, equipmentIdsToSlots } from '../items/itemUtils.js';
import {
  ENCUMBERED_STEP_MS,
  GRID_STEP_MS,
} from '../world/gridMovement.js';
import { VELOCIDADE_STAT_LABEL } from '../stats/statDisplayLabels.js';

/** Bônus acumulados do SET equipado — valores iniciais em zero. */
export type PlayerStatsBonus = {
  defesa: number;
  esquiva: number;
  vida: number;
  agilidade: number;
  critico: number;
  forca: number;
};

export const EMPTY_PLAYER_STATS_BONUS: PlayerStatsBonus = {
  defesa: 0,
  esquiva: 0,
  vida: 0,
  agilidade: 0,
  critico: 0,
  forca: 0,
};

/** Rótulos para o painel "Stats Atuais" na sidebar. */
export const PLAYER_STATS_BONUS_LABELS: Record<keyof PlayerStatsBonus, string> = {
  defesa: 'Defesa',
  esquiva: 'Esquiva',
  vida: 'Vida',
  agilidade: VELOCIDADE_STAT_LABEL,
  critico: 'Crítico',
  forca: 'Força',
};

export function createEmptyStatsBonus(): PlayerStatsBonus {
  return { ...EMPTY_PLAYER_STATS_BONUS };
}

/**
 * Soma efeitos do catálogo sobre o SET equipado (via `calculateTotalStats` + esquiva).
 */
export function calculateStatsBonusFromEquipment(
  equipment: EquipmentUiGridState,
): PlayerStatsBonus {
  const totals = calculateTotalStats(equipmentIdsToSlots(Object.values(equipment)));
  const bonus = createEmptyStatsBonus();
  bonus.defesa = totals.defesa;
  bonus.vida = totals.vida;
  bonus.agilidade = totals.agilidade;
  bonus.critico = totals.critico;
  bonus.forca = totals.forca;

  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    const item = getAuthoritativeItemById(itemId);
    if (!item) continue;
    for (const effect of item.effects) {
      if (effect.combatOnly || effect.stat !== 'DODGE') continue;
      bonus.esquiva += effect.value;
    }
  }

  return bonus;
}

/** Bônus % de deslocamento no mapa a partir da Velocidade do SET (mesmo stat que alimenta iniciativa na batalha). */
export function computeSpeedBonusTotal(
  agilidade: number,
  baseSpeed = 0,
): number {
  return baseSpeed + agilidade * 2;
}

/** Duração do passo na grade — legado (UI/tests); movimento contínuo usa resolveMoveSpeedPxPerSec. */
export function resolveGridStepDurationMs(
  speedBonusTotal: number,
  isEncumbered: boolean,
): number {
  if (isEncumbered) return ENCUMBERED_STEP_MS;

  if (speedBonusTotal <= 0) return GRID_STEP_MS;

  const speedMultiplier = 1 + speedBonusTotal / 100;
  return Math.max(80, Math.round(GRID_STEP_MS / speedMultiplier));
}

/** Velocidade contínua (px/s) — bônus do SET acelera; sobrecarga reduz. */
export function resolveMoveSpeedPxPerSec(
  speedBonusTotal: number,
  isEncumbered: boolean,
  baseSpeedPxPerSec: number,
): number {
  let speed = baseSpeedPxPerSec;
  if (isEncumbered) {
    speed *= GRID_STEP_MS / ENCUMBERED_STEP_MS;
  } else if (speedBonusTotal > 0) {
    speed *= 1 + speedBonusTotal / 100;
  }
  return speed;
}
