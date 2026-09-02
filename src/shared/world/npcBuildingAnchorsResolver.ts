import type { NpcRegistryEntry } from './npcRegistry.js';
import { resolveNpcArchetypeId } from '../npc/resolveNpcArchetypeId.js';
import {
  applyConstructNpcPlacement,
  listActiveConstructNpcInstances,
  type ConstructNpcInstancePlacement,
} from './constructNpcPlacements.js';

/**
 * Resolve posições de NPC — única autoridade: markers Construct.
 * Expande archetypes em instâncias multi-spawn (humano_1#0, humano_1#1, …).
 */
export function resolveNpcRegistryEntries(
  entries: readonly NpcRegistryEntry[],
): readonly NpcRegistryEntry[] {
  const activeInstances = listActiveConstructNpcInstances();
  const byArchetype = new Map<string, ConstructNpcInstancePlacement[]>();

  for (const inst of activeInstances) {
    const list = byArchetype.get(inst.archetypeId) ?? [];
    list.push(inst);
    byArchetype.set(inst.archetypeId, list);
  }

  const resolved: NpcRegistryEntry[] = [];

  for (const entry of entries) {
    const archetypeId = resolveNpcArchetypeId(entry.id);
    const instances = byArchetype.get(archetypeId);
    if (!instances || instances.length === 0) {
      continue;
    }

    if (instances.length === 1 && instances[0]!.instanceId === archetypeId) {
      resolved.push(applyConstructNpcPlacement(entry, instances[0]!));
      continue;
    }

    for (const inst of instances) {
      resolved.push(
        applyConstructNpcPlacement(
          {
            ...entry,
            id: inst.instanceId,
          },
          inst,
        ),
      );
    }
  }

  return resolved;
}
