import type { NpcRegistryEntry } from './npcRegistry.js';
import { resolveServiceNpcAnchorTile, shouldApplyBuildingAnchor } from './npcBuildingAnchors.js';
import {
  getTiledNpcPlacement,
  hasTiledNpcPlacements,
} from './tiledMapPlacements.js';

/** Aplica ancoragem building→NPC somente para NPCs de serviço (economia). */
export function applyNpcBuildingAnchors(entry: NpcRegistryEntry): NpcRegistryEntry {
  if (!shouldApplyBuildingAnchor(entry.id)) {
    return entry;
  }

  const anchored = resolveServiceNpcAnchorTile(entry.id);
  if (!anchored) {
    return entry;
  }

  return {
    ...entry,
    tileX: anchored.tileX,
    tileY: anchored.tileY,
  };
}

function applyTiledNpcPlacement(entry: NpcRegistryEntry): NpcRegistryEntry {
  const placement = getTiledNpcPlacement(entry.mapId, entry.id);
  if (!placement) return entry;

  return {
    ...entry,
    tileX: placement.tileX,
    tileY: placement.tileY,
    worldX: placement.worldX,
    worldY: placement.worldY,
    collidable: placement.collidable,
  };
}

export function resolveNpcRegistryEntries(
  entries: readonly NpcRegistryEntry[],
): readonly NpcRegistryEntry[] {
  return entries.map((entry) => {
    const skipBuildingAnchor = hasTiledNpcPlacements(entry.mapId);
    const anchored = skipBuildingAnchor || !shouldApplyBuildingAnchor(entry.id)
      ? entry
      : applyNpcBuildingAnchors(entry);
    return applyTiledNpcPlacement(anchored);
  });
}
