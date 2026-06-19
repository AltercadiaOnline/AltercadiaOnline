import type { PlayerFacing } from './playerFacing.js';
import { DEFAULT_MAP_ID, getMapDefinition, type MapId } from './mapRegistry.js';
import { TILE_SIZE } from './mapConstants.js';
import { tileCenterToWorldPixel } from './portals.js';
import type { WorldExplorationSessionSync } from './zoneTransition.js';
import type { PlayerLoadoutData } from './playerLoadout.js';

export type WorldPosition = {
  readonly x: number;
  readonly y: number;
};

/** Perfil de mundo persistido no servidor — posição autoritativa. */
export type PlayerWorldProfile = {
  readonly currentMapId: string;
  readonly lastPosition: WorldPosition;
  readonly facing: PlayerFacing;
  /** Vitals, loadout e pet — sincronizados na Etapa A do portal. */
  readonly sessionSync?: WorldExplorationSessionSync;
  /** SET equipado — fonte da verdade para InventoryUpdated pós-loot. */
  readonly loadout?: PlayerLoadoutData;
};

export type WorldLoginResult = {
  readonly ok: true;
  readonly currentMapId: string;
  readonly lastPosition: WorldPosition;
  readonly facing: PlayerFacing;
  /** Aviso informativo para menores — definido pelo servidor; não bloqueia entrada. */
  readonly aviso_menor?: string;
};

export type PositionSyncReason = 'heartbeat' | 'logout' | 'battle';

export type PositionSyncPayload = {
  readonly characterId: number;
  readonly currentMapId: string;
  readonly lastPosition: WorldPosition;
  readonly facing?: PlayerFacing;
  readonly reason?: PositionSyncReason;
};

export function createDefaultWorldProfile(mapId: MapId = DEFAULT_MAP_ID): PlayerWorldProfile {
  const def = getMapDefinition(mapId);
  if (!def) {
    return {
      currentMapId: DEFAULT_MAP_ID,
      lastPosition: { x: 0, y: 0 },
      facing: 'south',
    };
  }

  const tileX = Math.floor((def.pixelWidth() / 2) / TILE_SIZE);
  const tileY = Math.floor((def.pixelHeight() / 2) / TILE_SIZE);
  const center = tileCenterToWorldPixel(tileX, tileY);

  return {
    currentMapId: mapId,
    lastPosition: { x: center.x, y: center.y },
    facing: 'south',
  };
}

export function isValidWorldPosition(position: WorldPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}
