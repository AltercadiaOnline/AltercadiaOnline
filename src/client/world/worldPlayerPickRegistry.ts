import { NPC_INTERACTION_RADIUS_TILES } from '../../shared/world/npcRegistry.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { Camera } from '../scenes/Camera.js';
import { worldToScreenPixel } from './screenCoords.js';
import {
  NAMETAG_FONT_SIZE_PX,
  resolveNametagOffsetAboveHeadPx,
} from './nametagRenderer.js';

export type WorldPlayerPickEntry = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly worldX: number;
  readonly worldY: number;
};

export type PlayerSpriteScreenRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const entries = new Map<string, WorldPlayerPickEntry>();

export function registerWorldPlayerPick(entry: WorldPlayerPickEntry): () => void {
  entries.set(entry.playerId, entry);
  return () => {
    entries.delete(entry.playerId);
  };
}

export function updateWorldPlayerPickPosition(
  playerId: string,
  worldX: number,
  worldY: number,
): void {
  const current = entries.get(playerId);
  if (!current) return;
  entries.set(playerId, { ...current, worldX, worldY });
}

/** Substitui o conjunto de picks visíveis (state-sync / tick de exploração). */
export function syncWorldPlayerPicks(next: readonly WorldPlayerPickEntry[]): void {
  const seen = new Set<string>();
  for (const entry of next) {
    seen.add(entry.playerId);
    entries.set(entry.playerId, entry);
  }
  for (const playerId of entries.keys()) {
    if (!seen.has(playerId)) {
      entries.delete(playerId);
    }
  }
}

export function clearWorldPlayerPicks(): void {
  entries.clear();
}

export function getWorldPlayerPickById(playerId: string): WorldPlayerPickEntry | null {
  return entries.get(playerId) ?? null;
}

export function resolvePlayerSpriteScreenRect(
  screenFeetX: number,
  screenFeetY: number,
  zoom = 1,
): PlayerSpriteScreenRect {
  const width = DESIGN_CONFIG.PLAYER.WIDTH * zoom;
  const height = DESIGN_CONFIG.PLAYER.HEIGHT * zoom;
  return {
    x: screenFeetX - width / 2,
    y: screenFeetY - height,
    width,
    height,
  };
}

/** Folga no clique: PNG 1:1 + faixa da nametag acima da cabeça. */
const PLAYER_INSPECT_PAD_PX = 8;
const PLAYER_INSPECT_NAMETAG_MIN_WIDTH_PX = 120;
const PLAYER_INSPECT_NAMETAG_PAD_PX = 8;

/**
 * Hitbox do direito no peer — corpo 35×54 mais a faixa do nome.
 * Nametag é `pointer-events: none`; sem isto o clique no nome cai no chão.
 */
export function resolvePlayerInspectScreenRect(
  screenFeetX: number,
  screenFeetY: number,
  zoom = 1,
): PlayerSpriteScreenRect {
  const sprite = resolvePlayerSpriteScreenRect(screenFeetX, screenFeetY, zoom);
  const extraTop =
    (resolveNametagOffsetAboveHeadPx() + NAMETAG_FONT_SIZE_PX + PLAYER_INSPECT_NAMETAG_PAD_PX) * zoom;
  const pad = PLAYER_INSPECT_PAD_PX * zoom;
  const minWidth = PLAYER_INSPECT_NAMETAG_MIN_WIDTH_PX * zoom;
  const width = Math.max(sprite.width + pad * 2, minWidth);
  return {
    x: screenFeetX - width / 2,
    y: sprite.y - extraTop,
    width,
    height: sprite.height + extraTop + pad,
  };
}

export type PlayerInspectWorldRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

/** Mesma hitbox do inspect, em px de mundo (pés do peer). */
export function resolvePlayerInspectWorldRect(
  feetX: number,
  feetY: number,
): PlayerInspectWorldRect {
  const extraTop =
    resolveNametagOffsetAboveHeadPx() + NAMETAG_FONT_SIZE_PX + PLAYER_INSPECT_NAMETAG_PAD_PX;
  const pad = PLAYER_INSPECT_PAD_PX;
  const halfWidth = Math.max(
    DESIGN_CONFIG.PLAYER.WIDTH / 2 + pad,
    PLAYER_INSPECT_NAMETAG_MIN_WIDTH_PX / 2,
  );
  return {
    left: feetX - halfWidth,
    right: feetX + halfWidth,
    top: feetY - DESIGN_CONFIG.PLAYER.HEIGHT - extraTop,
    bottom: feetY + pad,
  };
}

export function playerInspectWorldRectContains(
  rect: PlayerInspectWorldRect,
  worldX: number,
  worldY: number,
): boolean {
  return worldX >= rect.left
    && worldX <= rect.right
    && worldY >= rect.top
    && worldY <= rect.bottom;
}

export function playerSpriteRectIntersectsViewport(
  rect: PlayerSpriteScreenRect,
  viewportWidth = DESIGN_CONFIG.VIEWPORT.WIDTH,
  viewportHeight = DESIGN_CONFIG.VIEWPORT.HEIGHT,
): boolean {
  return rect.x + rect.width > 0
    && rect.x < viewportWidth
    && rect.y + rect.height > 0
    && rect.y < viewportHeight;
}

export function playerSpriteRectContains(
  rect: PlayerSpriteScreenRect,
  screenX: number,
  screenY: number,
): boolean {
  return screenX >= rect.x
    && screenX <= rect.x + rect.width
    && screenY >= rect.y
    && screenY <= rect.y + rect.height;
}

export function pickWorldPlayerAt(tileX: number, tileY: number): WorldPlayerPickEntry | null {
  let closest: WorldPlayerPickEntry | null = null;
  let closestDistance = NPC_INTERACTION_RADIUS_TILES + 1;

  const tileSize = getActiveMapTileSize();
  for (const entry of entries.values()) {
    const entryTileX = entry.worldX / tileSize;
    const entryTileY = entry.worldY / tileSize;
    const distance = Math.hypot(entryTileX - tileX, entryTileY - tileY);
    if (distance <= NPC_INTERACTION_RADIUS_TILES && distance < closestDistance) {
      closest = entry;
      closestDistance = distance;
    }
  }

  return closest;
}

export function hasWorldPlayerPicks(): boolean {
  return entries.size > 0;
}

/**
 * Direito no peer: hitbox em px de mundo (independe do scale CSS).
 * Preferir este pick; o on-screen fica como fallback.
 */
export function pickWorldPlayerAtWorldPixel(
  worldX: number,
  worldY: number,
): WorldPlayerPickEntry | null {
  let closest: WorldPlayerPickEntry | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const entry of entries.values()) {
    const rect = resolvePlayerInspectWorldRect(entry.worldX, entry.worldY);
    if (!playerInspectWorldRectContains(rect, worldX, worldY)) continue;
    const distance = Math.hypot(worldX - entry.worldX, worldY - entry.worldY);
    if (distance < closestDistance) {
      closest = entry;
      closestDistance = distance;
    }
  }

  return closest;
}

/**
 * Direito no peer on-screen (640×360): corpo + nametag. Não usa raio de NPC.
 * O HUD pinado não depende deste pick depois de aberto.
 */
export function pickWorldPlayerSpriteOnScreen(
  camera: Camera,
  screenX: number,
  screenY: number,
): WorldPlayerPickEntry | null {
  let closest: WorldPlayerPickEntry | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  const zoom = camera.effectiveZoom || 1;

  for (const entry of entries.values()) {
    const feet = worldToScreenPixel(camera, entry.worldX, entry.worldY);
    const rect = resolvePlayerInspectScreenRect(feet.screenX, feet.screenY, zoom);
    if (!playerSpriteRectIntersectsViewport(rect)) continue;
    if (!playerSpriteRectContains(rect, screenX, screenY)) continue;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const distance = Math.hypot(screenX - cx, screenY - cy);
    if (distance < closestDistance) {
      closest = entry;
      closestDistance = distance;
    }
  }

  return closest;
}

/** Folga se o clique cair perto do peer mas fora do AABB (scale CSS / nametag). */
const PLAYER_INSPECT_NEAREST_FALLBACK_PX = 72;

export function pickNearestWorldPlayerOnScreen(
  camera: Camera,
  screenX: number,
  screenY: number,
  maxDistancePx = PLAYER_INSPECT_NEAREST_FALLBACK_PX,
): WorldPlayerPickEntry | null {
  let closest: WorldPlayerPickEntry | null = null;
  let closestDistance = maxDistancePx;
  const zoom = camera.effectiveZoom || 1;

  for (const entry of entries.values()) {
    const feet = worldToScreenPixel(camera, entry.worldX, entry.worldY);
    const rect = resolvePlayerInspectScreenRect(feet.screenX, feet.screenY, zoom);
    if (!playerSpriteRectIntersectsViewport(rect)) continue;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const distance = Math.hypot(screenX - cx, screenY - cy);
    if (distance < closestDistance) {
      closest = entry;
      closestDistance = distance;
    }
  }

  return closest;
}

export function isWorldPlayerWithinInteractionRadius(
  entry: WorldPlayerPickEntry,
  worldX: number,
  worldY: number,
): boolean {
  const tileSize = getActiveMapTileSize();
  const playerTileX = worldX / tileSize;
  const playerTileY = worldY / tileSize;
  const entryTileX = entry.worldX / tileSize;
  const entryTileY = entry.worldY / tileSize;
  return Math.hypot(entryTileX - playerTileX, entryTileY - playerTileY) <= NPC_INTERACTION_RADIUS_TILES;
}
