import type { NpcRegistryEntry } from './npcRegistry.js';
import { applyConstructNpcPlacement } from './constructNpcPlacements.js';

/**
 * Resolve posições de NPC — única autoridade: markers Construct.
 * NPCs sem marker (ex.: instrutor_refraction) mantêm tileX/tileY do registry.
 */
export function resolveNpcRegistryEntries(
  entries: readonly NpcRegistryEntry[],
): readonly NpcRegistryEntry[] {
  return entries.map((entry) => applyConstructNpcPlacement(entry));
}
