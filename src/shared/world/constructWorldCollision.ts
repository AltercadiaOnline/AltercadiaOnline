import type { MapId } from './mapRegistry.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';
import {
  CONSTRUCT_NPC_PLACEMENTS,
  constructNpcCollisionHitbox,
  hasConstructNpcPlacement,
} from './constructNpcPlacements.js';
import {
  buildConstructPropObstacles,
} from './constructCollidableProps.js';
import { getResolvedNpcRegistry } from './npcRegistry.js';
import { isNpcDefinitionCollidable } from '../../assets/npcs/npcDefinition.js';
import {
  clearWorldCollisionObstacles,
  getWorldCollisionObstacles,
  setActiveWorldCollisionMapId,
  setWorldCollisionObstacles,
} from './worldCollisionRegistry.js';

function buildNpcObstacles(mapId: MapId): readonly WorldCollisionObstacle[] {
  const out: WorldCollisionObstacle[] = [];
  for (const entry of getResolvedNpcRegistry()) {
    if (entry.mapId !== mapId) continue;
    const collidable = entry.collidable ?? isNpcDefinitionCollidable(entry.id);
    if (!collidable) continue;
    if (!hasConstructNpcPlacement(entry.id, mapId)) continue;
    const placement = CONSTRUCT_NPC_PLACEMENTS[entry.id]!;
    out.push({
      id: `npc:${entry.id}`,
      kind: 'npc',
      hitbox: constructNpcCollisionHitbox(entry.id, placement),
    });
  }
  return out;
}

/**
 * Obstáculos do mapa ativo:
 * - props → polígonos Solid do Construct (extract)
 * - NPCs → AABB Altercadia (asset size)
 * Criaturas não entram no registry (não bloqueiam movimento).
 */
export function syncConstructWorldCollision(mapId: MapId): void {
  const obstacles = [
    ...buildNpcObstacles(mapId),
    ...buildConstructPropObstacles(mapId),
  ];
  setWorldCollisionObstacles(mapId, obstacles);
  setActiveWorldCollisionMapId(mapId);
}

/** Garante polígonos do mapa ativo (cidade + beco) antes de validar o passo. */
export function ensureWorldCollisionForMap(mapId: MapId): void {
  if (getWorldCollisionObstacles(mapId).length === 0) {
    syncConstructWorldCollision(mapId);
    return;
  }
  setActiveWorldCollisionMapId(mapId);
}

export function resetConstructWorldCollision(): void {
  clearWorldCollisionObstacles();
}
