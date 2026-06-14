import type { MinimapMarker } from './minimapTypes.js';

export type MinimapNpcMarkerSource = {
  readonly tileX: number;
  readonly tileY: number;
};

export type MinimapMonsterMarkerSource = {
  readonly tileX: number;
  readonly tileY: number;
};

/**
 * Publica posições de NPCs do mapa atual para o minimapa.
 */
export function collectMinimapNpcMarkers(
  npcs: readonly MinimapNpcMarkerSource[],
): MinimapMarker[] {
  return npcs.map((npc) => ({
    kind: 'npc' as const,
    tileX: npc.tileX,
    tileY: npc.tileY,
  }));
}

/**
 * Publica posições de monstros ativos para o minimapa.
 */
export function collectMinimapMonsterMarkers(
  monsters: readonly MinimapMonsterMarkerSource[],
): MinimapMarker[] {
  return monsters.map((monster) => ({
    kind: 'monster' as const,
    tileX: monster.tileX,
    tileY: monster.tileY,
  }));
}
