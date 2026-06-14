import type { PetSnapshot } from '../pet/petModel.js';
import type { MapTransitionPayload } from './protocol.js';
import type { PlayerFacing } from './playerFacing.js';
import { CITY_01_ID } from './maps/city01.js';
import type { Portal } from './portals.js';
import {
  buildPortalTransitionPayload,
  tileCenterToWorldPixel,
  worldPixelToTile,
} from './portals.js';
import { portalReferenceTile } from './portalAccess.js';
import { getMapDefinition, type MapId } from './mapRegistry.js';
import { validatePortalAccess } from './portalAccess.js';
import { isWithinInteractionRadius } from './interactableDistance.js';
import { TILE_SIZE } from './mapConstants.js';
import type { WorldPosition } from './playerWorldProfile.js';

/** Timeout do handshake Etapa A → confirmação do servidor. */
export const PORTAL_TRANSITION_TIMEOUT_MS = 12_000;

/** Distância em tiles para iniciar pré-carregamento do mapa de destino. */
export const PORTAL_PRELOAD_TILE_RADIUS = 14;

/** Spawn seguro na cidade (retorno do beco / fallback de rede). */
export const CITY_SAFE_SPAWN_TILE = { x: 29, y: 2 } as const;

export type WorldExplorationSessionSync = {
  readonly worldVitals?: {
    readonly hpCurrent: number;
    readonly hpMax: number;
    readonly mpCurrent: number;
    readonly mpMax: number;
  };
  readonly activeMovesets?: readonly string[];
  readonly pet?: PetSnapshot | null;
};

export type PortalTransitionRequestPayload = {
  readonly requestId: string;
  readonly portalId: string;
  readonly characterId: number;
  readonly currentMapId: string;
  readonly lastPosition: WorldPosition;
  readonly facing: PlayerFacing;
  readonly playerLevel: number;
  readonly sessionSync?: WorldExplorationSessionSync;
};

export type PortalTransitionReadyPayload = MapTransitionPayload & {
  readonly requestId: string;
  readonly transitionId: string;
};

export type PortalTransitionFailedPayload = {
  readonly requestId: string;
  readonly reason: string;
  readonly code: 'ACCESS_DENIED' | 'INVALID_PORTAL' | 'NOT_NEAR_PORTAL' | 'INVALID_MAP' | 'SERVER_ERROR';
  readonly fallback?: MapTransitionPayload;
};

export type PortalTransitionResolveResult =
  | { readonly ok: true; readonly ready: PortalTransitionReadyPayload }
  | { readonly ok: false; readonly failed: Omit<PortalTransitionFailedPayload, 'requestId'> };

export function buildCitySafeSpawnPayload(facing: PlayerFacing = 'south'): MapTransitionPayload {
  const spawn = tileCenterToWorldPixel(CITY_SAFE_SPAWN_TILE.x, CITY_SAFE_SPAWN_TILE.y);
  return {
    mapId: CITY_01_ID,
    x: spawn.x,
    y: spawn.y,
    facing,
    portalLabel: 'Centro da Cidade',
  };
}

export function portalChebyshevDistanceTiles(
  playerX: number,
  playerY: number,
  portal: Portal,
): number {
  const ref = portalReferenceTile(portal);
  const player = worldPixelToTile(playerX, playerY);
  return Math.max(Math.abs(player.tileX - ref.tileX), Math.abs(player.tileY - ref.tileY));
}

export function shouldPreloadPortalDestination(
  playerX: number,
  playerY: number,
  portal: Portal,
  radiusTiles = PORTAL_PRELOAD_TILE_RADIUS,
): boolean {
  return portalChebyshevDistanceTiles(playerX, playerY, portal) <= radiusTiles;
}

export function isPlayerNearPortal(
  playerX: number,
  playerY: number,
  portal: Portal,
): boolean {
  const ref = portalReferenceTile(portal);
  return isWithinInteractionRadius(playerX, playerY, ref);
}

export function resolvePortalTransition(
  request: PortalTransitionRequestPayload,
): PortalTransitionResolveResult {
  const mapDef = getMapDefinition(request.currentMapId as MapId);
  if (!mapDef) {
    return {
      ok: false,
      failed: {
        reason: 'Mapa de origem inválido.',
        code: 'INVALID_MAP',
        fallback: buildCitySafeSpawnPayload(request.facing),
      },
    };
  }

  const portal = mapDef.portals.find((entry) => entry.id === request.portalId);
  if (!portal) {
    return {
      ok: false,
      failed: {
        reason: 'Portal desconhecido.',
        code: 'INVALID_PORTAL',
        fallback: buildCitySafeSpawnPayload(request.facing),
      },
    };
  }

  if (!isPlayerNearPortal(request.lastPosition.x, request.lastPosition.y, portal)) {
    return {
      ok: false,
      failed: {
        reason: 'Aproxime-se do portal (1,5 tiles).',
        code: 'NOT_NEAR_PORTAL',
      },
    };
  }

  const access = validatePortalAccess(portal, request.playerLevel);
  if (!access.ok) {
    return {
      ok: false,
      failed: {
        reason: access.reason,
        code: 'ACCESS_DENIED',
      },
    };
  }

  const targetDef = getMapDefinition(portal.targetMapId as MapId);
  if (!targetDef) {
    return {
      ok: false,
      failed: {
        reason: 'Zona de destino indisponível.',
        code: 'INVALID_MAP',
        fallback: buildCitySafeSpawnPayload(request.facing),
      },
    };
  }

  const mapPayload = buildPortalTransitionPayload(portal, request.currentMapId, request.facing);
  const transitionId = `pt-${request.portalId}-${Date.now()}`;

  return {
    ok: true,
    ready: {
      requestId: request.requestId,
      transitionId,
      ...mapPayload,
    },
  };
}

/** Pré-aquece dados de colisão do mapa (barato, roda em background no cliente). */
export function warmMapCollisionData(mapId: MapId): number[][] {
  const def = getMapDefinition(mapId);
  if (!def) return [];
  return def.generateData();
}

export function estimateMapPreloadWeight(mapData: readonly (readonly number[])[]): number {
  let tiles = 0;
  for (const row of mapData) {
    tiles += row.length;
  }
  return tiles * TILE_SIZE;
}

export function parsePortalTransitionRequestPayload(
  value: unknown,
): PortalTransitionRequestPayload | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  const requestId = p.requestId;
  const portalId = p.portalId;
  const characterId = p.characterId;
  const currentMapId = p.currentMapId;
  const lastPosition = p.lastPosition;
  const facing = p.facing;
  const playerLevel = p.playerLevel;

  if (typeof requestId !== 'string' || requestId.length === 0) return null;
  if (typeof portalId !== 'string' || portalId.length === 0) return null;
  if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;
  if (typeof currentMapId !== 'string' || currentMapId.length === 0) return null;
  if (typeof playerLevel !== 'number' || !Number.isFinite(playerLevel)) return null;
  if (typeof lastPosition !== 'object' || lastPosition === null) return null;
  const pos = lastPosition as Record<string, unknown>;
  if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return null;
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  if (typeof facing !== 'string') return null;

  const base: PortalTransitionRequestPayload = {
    requestId,
    portalId,
    characterId,
    currentMapId,
    lastPosition: { x: pos.x, y: pos.y },
    facing: facing as PlayerFacing,
    playerLevel,
  };

  const sessionSync = parseSessionSync(p.sessionSync);
  return sessionSync ? { ...base, sessionSync } : base;
}

function parseSessionSync(value: unknown): WorldExplorationSessionSync | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  const parts: WorldExplorationSessionSync[] = [];

  const vitals = s.worldVitals;
  if (vitals && typeof vitals === 'object') {
    const v = vitals as Record<string, unknown>;
    if (
      typeof v.hpCurrent === 'number'
      && typeof v.hpMax === 'number'
      && typeof v.mpCurrent === 'number'
      && typeof v.mpMax === 'number'
    ) {
      parts.push({
        worldVitals: {
          hpCurrent: v.hpCurrent,
          hpMax: v.hpMax,
          mpCurrent: v.mpCurrent,
          mpMax: v.mpMax,
        },
      });
    }
  }

  if (Array.isArray(s.activeMovesets)) {
    const moves = s.activeMovesets.filter((id): id is string => typeof id === 'string');
    if (moves.length > 0) parts.push({ activeMovesets: moves });
  }

  if (s.pet === null) {
    parts.push({ pet: null });
  }

  if (parts.length === 0) return null;

  return parts.reduce<WorldExplorationSessionSync>(
    (acc, part) => ({ ...acc, ...part }),
    {},
  );
}
