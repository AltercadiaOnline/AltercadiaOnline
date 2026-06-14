import { resolveMoveSpeedPxPerSec } from '../character/playerStatsBonus.js';
import { getActiveMapTileSize } from './activeMapTileSize.js';
import { resolvePlayerMoveSpeedPxPerSec } from './movement.js';

/**
 * Velocidade de locomoção no mapa top-down (exploração).
 * Não inclui iniciativa, ordem de turno nem métricas de batalha por turnos.
 */

export type WorldExplorationMoveSpeedSnapshot = {
  readonly currentPxPerSec: number;
  /** Referência: velocidade base do mundo sem bônus de agilidade nem sobrecarga. */
  readonly basePxPerSec: number;
};

export function resolveWorldExplorationMoveSpeed(
  speedBonusTotal: number,
  isEncumbered: boolean,
  tileSize = getActiveMapTileSize(),
): WorldExplorationMoveSpeedSnapshot {
  const basePxPerSec = resolvePlayerMoveSpeedPxPerSec(tileSize);
  return {
    basePxPerSec,
    currentPxPerSec: resolveMoveSpeedPxPerSec(speedBonusTotal, isEncumbered, basePxPerSec),
  };
}

export function formatWorldExplorationMoveSpeedDisplay(
  snapshot: WorldExplorationMoveSpeedSnapshot,
): string {
  return `${Math.round(snapshot.currentPxPerSec)} / ${Math.round(snapshot.basePxPerSec)}`;
}
