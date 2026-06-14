import { isNpcDefinitionCollidable } from '../../assets/npcs/npcDefinition.js';
import type { MapId } from './mapRegistry.js';
import { getResolvedNpcRegistry } from './npcRegistry.js';

function isNpcCollidableAtRuntime(npcId: string): boolean {
  return isNpcDefinitionCollidable(npcId);
}
let activeMapId: MapId | null = null;

/** Define o mapa ativo para checagem de ocupação por NPC (cliente / exploração). */
export function setActiveNpcOccupancyMapId(mapId: MapId | null): void {
  activeMapId = mapId;
}

export function isNpcOccupiedTile(tileX: number, tileY: number): boolean {
  if (!activeMapId) return false;

  return getResolvedNpcRegistry().some((npc) => {
    if (npc.mapId !== activeMapId) return false;
    if (npc.tileX !== tileX || npc.tileY !== tileY) return false;
    return isNpcCollidableAtRuntime(npc.id);
  });
}
