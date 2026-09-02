import { resolveNpcArchetypeId } from '../npc/resolveNpcArchetypeId.js';
import type { MapId } from '../world/mapRegistry.js';
import { isWithinInteractionRadius } from '../world/interactableDistance.js';
import { getResolvedNpcRegistry, type NpcRegistryEntry } from '../world/npcRegistry.js';

export type MercenaryQuestRangeCheck =
  | { readonly ok: true; readonly npc: NpcRegistryEntry }
  | { readonly ok: false; readonly code: string; readonly message: string };

function findQuestNpcOnMap(targetId: string, mapId: MapId): NpcRegistryEntry | null {
  const registry = getResolvedNpcRegistry();
  const exact = registry.find((npc) => npc.id === targetId && npc.mapId === mapId);
  if (exact) return exact;
  const archetypeId = resolveNpcArchetypeId(targetId);
  return registry.find(
    (npc) => resolveNpcArchetypeId(npc.id) === archetypeId && npc.mapId === mapId,
  ) ?? null;
}

/** Distância autoritativa: mapa da sessão + raio de NPC (~1,5 tile). */
export function assertMercenaryQuestNpcInRange(
  targetId: string,
  targetMapId: MapId,
  player: { readonly mapId: MapId; readonly x: number; readonly y: number },
): MercenaryQuestRangeCheck {
  if (player.mapId !== targetMapId) {
    return {
      ok: false,
      code: 'QUEST_MAP_MISMATCH',
      message: 'Este contact não está neste mapa.',
    };
  }
  const npc = findQuestNpcOnMap(targetId, targetMapId);
  if (!npc) {
    return {
      ok: false,
      code: 'QUEST_TARGET_MISSING',
      message: 'Contact de contrato não encontrado neste mapa.',
    };
  }
  if (!isWithinInteractionRadius(player.x, player.y, npc)) {
    return {
      ok: false,
      code: 'QUEST_OUT_OF_RANGE',
      message: 'Chegue mais perto do alvo do contrato.',
    };
  }
  return { ok: true, npc };
}
