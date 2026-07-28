import type { PlayerFacing } from './playerFacing.js';
import { DEFAULT_MAP_ID, getMapDefinition, type MapId } from './mapRegistry.js';
import { TILE_SIZE } from './mapConstants.js';
import { tileCenterToWorldPixel } from './portals.js';
import type { WorldExplorationSessionSync } from './zoneTransition.js';
import type { PlayerLoadoutData } from './playerLoadout.js';
import { resolveConstructPlayerSpawn } from './constructPlayerSpawnPlacements.js';

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
  const resolvedMapId = getMapDefinition(mapId) ? mapId : DEFAULT_MAP_ID;
  const def = getMapDefinition(resolvedMapId);

  const constructSpawn = resolveConstructPlayerSpawn(resolvedMapId);
  if (constructSpawn) {
    return {
      currentMapId: resolvedMapId,
      lastPosition: { x: constructSpawn.worldX, y: constructSpawn.worldY },
      facing: 'south',
    };
  }

  if (!def) {
    // Último recurso — nunca devolver NaN/undefined (invisível no overlay Construct).
    return {
      currentMapId: DEFAULT_MAP_ID,
      lastPosition: { x: TILE_SIZE / 2, y: TILE_SIZE / 2 },
      facing: 'south',
    };
  }

  const tileX = Math.floor((def.pixelWidth() / 2) / TILE_SIZE);
  const tileY = Math.floor((def.pixelHeight() / 2) / TILE_SIZE);
  const center = tileCenterToWorldPixel(tileX, tileY);

  return {
    currentMapId: resolvedMapId,
    lastPosition: { x: center.x, y: center.y },
    facing: 'south',
  };
}

export function isValidWorldPosition(position: WorldPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

const VALID_FACINGS = new Set<PlayerFacing>(['north', 'south', 'east', 'west']);

function isValidFacing(value: unknown): value is PlayerFacing {
  return typeof value === 'string' && VALID_FACINGS.has(value as PlayerFacing);
}

/**
 * Hidrata save local / snapshot — se mapId, lastPosition ou coords fora do mapa
 * estiverem corrompidos, cai no spawn Construct default (evita PNG invisível / WASD morto).
 */
export function sanitizePlayerWorldProfile(
  world: Partial<PlayerWorldProfile> | null | undefined,
): PlayerWorldProfile {
  const mapIdRaw = typeof world?.currentMapId === 'string' ? world.currentMapId : DEFAULT_MAP_ID;
  const mapId = (getMapDefinition(mapIdRaw as MapId) ? mapIdRaw : DEFAULT_MAP_ID) as MapId;
  const fallback = createDefaultWorldProfile(mapId);
  const position = world?.lastPosition;
  const def = getMapDefinition(mapId);

  const inBounds = Boolean(
    position
    && isValidWorldPosition(position)
    && def
    && position.x >= 0
    && position.y >= 0
    && position.x < def.pixelWidth()
    && position.y < def.pixelHeight(),
  );

  if (!inBounds) {
    return {
      ...fallback,
      ...(world?.sessionSync !== undefined ? { sessionSync: world.sessionSync } : {}),
      ...(world?.loadout !== undefined ? { loadout: world.loadout } : {}),
    };
  }

  return {
    currentMapId: mapId,
    lastPosition: { x: position!.x, y: position!.y },
    facing: isValidFacing(world?.facing) ? world.facing : 'south',
    ...(world?.sessionSync !== undefined ? { sessionSync: world.sessionSync } : {}),
    ...(world?.loadout !== undefined ? { loadout: world.loadout } : {}),
  };
}
