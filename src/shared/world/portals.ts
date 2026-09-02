import { getActiveMapTileSize } from './activeMapTileSize.js';
import { DESIGN_CONFIG, tileGridToWorldOrigin } from '../../config/designConstants.js';
import type { PlayerFacing } from './playerFacing.js';
import type { MapTransitionPayload } from './protocol.js';
import type { ZoneId } from '../items/itemTypes.js';

export type PortalDirection = 'north' | 'south' | 'east' | 'west';

/** Distância máxima (Chebyshev, em tiles) do centro do marker Construct — 1 sqm. */
export const PORTAL_TRIGGER_RADIUS_TILES = 1;

/** Coordenada de tile de destino após atravessar o portal. */
export type PortalPosition = {
  readonly x: number;
  readonly y: number;
};

/**
 * Objeto estático de portal — cada mapa declara sua própria lista.
 * Não há linkagem global entre mapas; targetMapId e targetPosition são manuais.
 */
export type Portal = {
  readonly id: string;
  readonly mapId: string;
  readonly label: string;
  readonly direction: PortalDirection;
  /** Zona retangular de gatilho — tile coords inclusivas. */
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
  readonly targetMapId: string;
  readonly targetPosition: PortalPosition;
  /** Layout Construct onde o gatilho está ativo. */
  readonly sourceConstructLayout?: string;
  /** Layout Construct a carregar no destino (subzonas farm). */
  readonly targetConstructLayout?: string;
  /** Opcional: validação de nível na zona de destino (não conecta mapas automaticamente). */
  readonly targetZoneId?: ZoneId;
};

/** @deprecated Use Portal — alias mantido para imports legados. */
export type PortalZone = Portal;

/** Spawn de destino (alias legado). */
export type PortalTargetSpawn = PortalPosition;

/** Visão simplificada para triggers de colisão. */
export type MapPortalTrigger = {
  readonly x: number;
  readonly y: number;
  readonly targetMapId: string;
  readonly targetSpawn: PortalTargetSpawn;
};

export function portalTargetSpawn(portal: Portal): PortalTargetSpawn {
  return portal.targetPosition;
}

export function toMapPortalTrigger(portal: Portal): MapPortalTrigger {
  return {
    x: portal.tileX,
    y: portal.tileY,
    targetMapId: portal.targetMapId,
    targetSpawn: portalTargetSpawn(portal),
  };
}

/** Tile central do portal (referência visual + interação). */
export function portalCenterTile(portal: Portal): PortalPosition {
  return {
    x: portal.tileX + Math.floor((portal.tileW - 1) / 2),
    y: portal.tileY + Math.floor((portal.tileH - 1) / 2),
  };
}

/** Distância Chebyshev do tile do jogador ao centro do portal. */
export function portalChebyshevDistanceFromCenter(
  portal: Portal,
  tileX: number,
  tileY: number,
): number {
  const center = portalCenterTile(portal);
  return Math.max(Math.abs(tileX - center.x), Math.abs(tileY - center.y));
}

/** Zona retangular legada — walkable / debug; não usar para gatilho de teleporte. */
export function portalZoneContains(
  portal: Portal,
  tileX: number,
  tileY: number,
): boolean {
  return (
    tileX >= portal.tileX
    && tileX < portal.tileX + portal.tileW
    && tileY >= portal.tileY
    && tileY < portal.tileY + portal.tileH
  );
}

/** Gatilho — sobre o marker ou até 1 tile (sqm) do centro Construct. */
export function portalInteractionContains(
  portal: Portal,
  tileX: number,
  tileY: number,
): boolean {
  return portalChebyshevDistanceFromCenter(portal, tileX, tileY) <= PORTAL_TRIGGER_RADIUS_TILES;
}

export function findPortalAtTile(
  portals: readonly Portal[],
  tileX: number,
  tileY: number,
): Portal | null {
  let best: Portal | null = null;
  let bestDistance = Infinity;
  for (const portal of portals) {
    const distance = portalChebyshevDistanceFromCenter(portal, tileX, tileY);
    if (distance <= PORTAL_TRIGGER_RADIUS_TILES && distance < bestDistance) {
      best = portal;
      bestDistance = distance;
    }
  }
  return best;
}

/** Origem do tile na grade — (tileX × tileSize, tileY × tileSize). */
export function tileToWorldPixel(
  tileX: number,
  tileY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { x: number; y: number } {
  if (tileSize === DESIGN_CONFIG.TILE.SIZE) {
    return tileGridToWorldOrigin(tileX, tileY);
  }
  return { x: tileX * tileSize, y: tileY * tileSize } as const;
}

/** Centro do tile — spawn do jogador e foco de movimento. */
export function tileCenterToWorldPixel(
  tileX: number,
  tileY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { x: number; y: number } {
  const origin = tileToWorldPixel(tileX, tileY, tileSize);
  return {
    x: origin.x + tileSize / 2,
    y: origin.y + tileSize / 2,
  };
}

export function worldPixelToTile(
  worldX: number,
  worldY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(worldX / tileSize),
    tileY: Math.floor(worldY / tileSize),
  };
}

export function findPortalNearWorldPosition(
  portals: readonly Portal[],
  playerX: number,
  playerY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): Portal | null {
  const { tileX, tileY } = worldPixelToTile(playerX, playerY, tileSize);
  return findPortalAtTile(portals, tileX, tileY);
}

/** Compara posição do jogador (pixels) com os portais do mapa atual. */
export function checkPortal(
  portals: readonly Portal[],
  playerX: number,
  playerY: number,
): Portal | null {
  const tileSize = getActiveMapTileSize();
  return findPortalNearWorldPosition(portals, playerX, playerY, tileSize);
}

export function buildPortalTransitionPayload(
  portal: Portal,
  _fromMapId: string,
  facing?: PlayerFacing,
): MapTransitionPayload {
  const spawn = tileCenterToWorldPixel(
    portal.targetPosition.x,
    portal.targetPosition.y,
    DESIGN_CONFIG.TILE.SIZE,
  );
  return {
    mapId: portal.targetMapId,
    x: spawn.x,
    y: spawn.y,
    portalLabel: portal.label,
    ...(portal.targetConstructLayout !== undefined
      ? { constructLayout: portal.targetConstructLayout }
      : {}),
    ...(facing !== undefined ? { facing } : {}),
  };
}
