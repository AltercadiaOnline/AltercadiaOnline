/**
 * Escala de poder da Torre de Poder (SSOT de fórmula).
 * Números de r / mult finos no balance; alvos de produto fixos na ficha.
 *
 * Âncora: Zona 2 @ nv 10 (ver monsterZoneScaling).
 * Andar 1: ~8× HP, ~4× ATK/DEF da âncora + mecânicas.
 * Curva: poder(n) = poder(1) × (r ^ (n-1)).
 * Alvo: andar 5 ≈ 4 jogadores nv 40 sofrem.
 * Party: sempre escala como time de 4.
 */

import { ZoneId } from '../items/itemTypes.js';
import { resolveMonsterStats } from '../combat/monsterZoneScaling.js';

/** Party heroica — boss sempre como se fossem 4. */
export const TOWER_PARTY_SCALE_SIZE = 4;

/** Mults do andar 1 sobre a âncora Zona2@10. */
export const TOWER_FLOOR1_HP_MULT = 8;
export const TOWER_FLOOR1_ATK_MULT = 4;
export const TOWER_FLOOR1_DEF_MULT = 4;

/**
 * Razão exponencial inicial (ajustável no balance).
 * Produto: interpolar até “4× nv40 sofrem” no andar 5.
 */
export const TOWER_FLOOR_POWER_RATIO = 1.5;

export const TOWER_ANCHOR_ZONE = ZoneId.Zone2;
export const TOWER_ANCHOR_LEVEL = 10;

export type TowerBossResolvedStats = {
  readonly floorIndex: number;
  readonly level: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly partyScaleSize: number;
  readonly floorPowerMult: number;
};

export function towerFloorPowerMultiplier(floorIndex: number): number {
  const n = Math.max(1, Math.floor(floorIndex));
  return TOWER_FLOOR_POWER_RATIO ** (n - 1);
}

/** Stats base do boss no andar (antes de mecânicas de entrada/combate). */
export function resolveTowerBossStats(floorIndex: number): TowerBossResolvedStats {
  const anchor = resolveMonsterStats(TOWER_ANCHOR_ZONE, TOWER_ANCHOR_LEVEL, false);
  const floorMult = towerFloorPowerMultiplier(floorIndex);
  return {
    floorIndex: Math.max(1, Math.floor(floorIndex)),
    level: TOWER_ANCHOR_LEVEL + (Math.max(1, Math.floor(floorIndex)) - 1) * 6,
    maxHp: Math.round(anchor.maxHp * TOWER_FLOOR1_HP_MULT * floorMult),
    attack: Math.round(anchor.attack * TOWER_FLOOR1_ATK_MULT * floorMult),
    defense: Math.round(anchor.defense * TOWER_FLOOR1_DEF_MULT * floorMult),
    partyScaleSize: TOWER_PARTY_SCALE_SIZE,
    floorPowerMult: floorMult,
  };
}
