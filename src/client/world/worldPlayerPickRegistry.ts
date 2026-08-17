import { NPC_INTERACTION_RADIUS_TILES } from '../../shared/world/npcRegistry.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { Camera } from '../scenes/Camera.js';
import { worldToScreenPixel } from './screenCoords.js';

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

/**
 * Direito no sprite on-screen (640×360). Não usa raio de NPC.
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
    const rect = resolvePlayerSpriteScreenRect(feet.screenX, feet.screenY, zoom);
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
