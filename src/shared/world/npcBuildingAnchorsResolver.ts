import type { NpcRegistryEntry } from './npcRegistry.js';
import { resolveServiceNpcAnchorTile, shouldApplyBuildingAnchor } from './npcBuildingAnchors.js';

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

export function resolveNpcRegistryEntries(
  entries: readonly NpcRegistryEntry[],
): readonly NpcRegistryEntry[] {
  return entries.map(applyNpcBuildingAnchors);
}
