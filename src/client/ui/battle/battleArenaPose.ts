import { DESIGN_CONFIG } from '../../../config/designConstants.js';

/** âncoras de casa — canvas e DOM usam as mesmas proporções. */
export const BATTLE_ARENA_ALLY_HOME_X = DESIGN_CONFIG.VIEWPORT.WIDTH * 0.26;
export const BATTLE_ARENA_FOE_HOME_X = DESIGN_CONFIG.VIEWPORT.WIDTH * 0.78;
export const BATTLE_ARENA_PET_HOME_X = DESIGN_CONFIG.VIEWPORT.WIDTH * 0.14;

/** Âncoras laterais para 1 / 2 / 3 inimigos (direita da arena, sem cruzar o player). */
const FOE_PACK_HOME_RATIOS: Readonly<Record<1 | 2 | 3, readonly number[]>> = {
  1: [0.78],
  2: [0.68, 0.86],
  3: [0.60, 0.75, 0.90],
};

export function resolveBattleFoePackKey(packSize: number): 1 | 2 | 3 {
  if (packSize >= 3) return 3;
  if (packSize <= 1) return 1;
  return 2;
}

export function resolveBattleFoeHomeRatios(packSize: number): readonly number[] {
  return FOE_PACK_HOME_RATIOS[resolveBattleFoePackKey(packSize)];
}

export function resolveBattleFoeHomeXs(packSize: number): readonly number[] {
  const width = DESIGN_CONFIG.VIEWPORT.WIDTH;
  return resolveBattleFoeHomeRatios(packSize).map((ratio) => width * ratio);
}

/** Linha de chão da arena (mesma âncora do canvas). */
export const BATTLE_ARENA_GROUND_Y = DESIGN_CONFIG.VIEWPORT.HEIGHT - 40;

/** Recuo vertical leve no grupo — o do meio fica um pouco mais “atrás”. */
export function resolveBattleFoeGroundDrop(packSize: number, index: number): number {
  if (packSize < 2) return 0;
  if (packSize === 2) return index === 0 ? 8 : 0;
  if (index === 1) return 10;
  return index === 0 ? 4 : 0;
}

/** Altura do sprite inimigo — encolhe um pouco no bando para caber na arena. */
export function resolveBattleFoeDrawHeight(packSize: number): number {
  if (packSize >= 3) return 118;
  if (packSize === 2) return 138;
  return 160;
}

/** Avanço até o contato (px). Player +. Criatura −. */
export const BATTLE_ARENA_CONTACT_OFFSET_PX = 22;

export function battleStrikeSign(side: 'ally' | 'foe'): 1 | -1 {
  return side === 'ally' ? 1 : -1;
}

export function sampleSmoothPose(
  from: number,
  to: number,
  startMs: number,
  durationMs: number,
  nowMs: number,
): { readonly x: number; readonly done: boolean } {
  if (durationMs <= 0) return { x: to, done: true };
  const t = Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
  const eased = t * t * (3 - 2 * t);
  return { x: from + (to - from) * eased, done: t >= 1 };
}
