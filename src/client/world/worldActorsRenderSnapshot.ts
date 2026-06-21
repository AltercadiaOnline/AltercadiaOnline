import { getEntityFeetWorldY } from '../../config/playerDesignAnchoring.js';
import {
  resolveSharedEntityVisualBounds,
} from '../../config/entitySpriteContract.js';
import {
  resolveEntitySpriteCenter,
} from '../../config/spriteDimensions.js';
import { getActiveMapTileSize, resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { getNpcDefinition } from '../../assets/npcs/npcDefinition.js';
import type { NPC } from '../entities/NPC.js';
import type { InteractiveEntity } from './InteractiveEntity.js';
import { resolveCreatureTileWorldPoint } from './creatureWorldRenderer.js';

/** Criatura no mapa — sprite idle top-down (não confundir com side-view de BattleSprite). */
export type WorldCreatureRenderSnapshot = {
  readonly kind: 'creature';
  readonly instanceId: string;
  readonly creatureId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly depthY: number;
  readonly adjacent: boolean;
  readonly alertPulse: number;
};

/** NPC no mapa — top-down, PNG ou humanoid procedural no canvas legado. */
export type WorldNpcRenderSnapshot = {
  readonly kind: 'npc';
  readonly npcId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly depthY: number;
  readonly bobOffset: number;
  readonly drawWidth: number;
  readonly drawHeight: number;
};

export type WorldActorRenderSnapshot = WorldCreatureRenderSnapshot | WorldNpcRenderSnapshot;

export function buildCreatureRenderSnapshot(entity: InteractiveEntity): WorldCreatureRenderSnapshot {
  const tileSize = getActiveMapTileSize();
  const worldPoint = resolveCreatureTileWorldPoint(entity.tileX, entity.tileY, tileSize);
  const feetY = getEntityFeetWorldY(worldPoint, tileSize);

  return {
    kind: 'creature',
    instanceId: entity.monsterId,
    creatureId: entity.creatureId,
    feetX: worldPoint.x,
    feetY,
    depthY: entity.depthY,
    adjacent: entity.isAdjacent(),
    alertPulse: entity.getAlertPulse(),
  };
}

export function buildNpcRenderSnapshot(npc: NPC, timestampMs: number): WorldNpcRenderSnapshot {
  const def = getNpcDefinition(npc.id);
  const bounds = resolveSharedEntityVisualBounds(
    npc.getLogicalPosition(),
    resolveMapTileSize(npc.mapId),
  );
  const { x: feetX, feetY } = resolveEntitySpriteCenter(bounds);
  const animSpeed = def?.animationSpeed ?? npc.animationSpeed;
  const drawWidth = def?.width ?? npc.dimensions.width;
  const drawHeight = def?.height ?? npc.dimensions.height;
  const bobPhase = timestampMs * animSpeed * 0.001 * Math.PI * 2;
  const bobOffset = Math.sin(bobPhase) * 1.5;

  return {
    kind: 'npc',
    npcId: npc.id,
    feetX,
    feetY,
    depthY: npc.depthY,
    bobOffset,
    drawWidth,
    drawHeight,
  };
}

export function sortWorldActorsByDepth(
  actors: readonly WorldActorRenderSnapshot[],
): WorldActorRenderSnapshot[] {
  return [...actors].sort((left, right) => left.depthY - right.depthY);
}
