import type { CollisionDebugDrawInput } from '../../debug/collisionDebugDraw.js';
import {
  isCollisionDebugEnabled,
  isVisualDebugModeEnabled,
} from '../../debug/visualDebugMode.js';
import type { NavigationDestination } from '../../managers/PointClickController.js';
import type { Portal } from '../../../shared/world/portals.js';
import type { WorldCreatureSnapshot } from '../../../shared/world/worldCreatureSync.js';

export type ExplorationDebugOverlaySnapshot = {
  readonly collision: CollisionDebugDrawInput;
  readonly creatureSnapshots: readonly WorldCreatureSnapshot[];
  readonly showCollisionDebug: boolean;
  readonly showCreatureDebug: boolean;
};

export type ExplorationOverlayFrameInput = {
  readonly mapId: string;
  readonly mapData: readonly (readonly number[])[];
  readonly portals: readonly Portal[];
  readonly playerX: number;
  readonly playerY: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly viewWidth: number;
  readonly viewHeight: number;
  readonly creatureSnapshots: readonly WorldCreatureSnapshot[];
  readonly navigationDestination: NavigationDestination | null;
};

export function buildExplorationDebugOverlaySnapshot(
  input: Omit<ExplorationOverlayFrameInput, 'navigationDestination'>,
): ExplorationDebugOverlaySnapshot | null {
  const showCollisionDebug = isCollisionDebugEnabled();
  const showCreatureDebug = isVisualDebugModeEnabled();

  if (!showCollisionDebug && !showCreatureDebug) {
    return null;
  }

  return {
    collision: {
      mapId: input.mapId,
      mapData: input.mapData,
      playerX: input.playerX,
      playerY: input.playerY,
      portals: input.portals,
      cameraX: input.cameraX,
      cameraY: input.cameraY,
      viewWidth: input.viewWidth,
      viewHeight: input.viewHeight,
    },
    creatureSnapshots: showCreatureDebug ? input.creatureSnapshots : [],
    showCollisionDebug,
    showCreatureDebug,
  };
}
