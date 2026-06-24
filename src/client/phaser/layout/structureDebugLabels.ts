import { PLACEHOLDER_ASSET_REGISTRY } from '../../world/placeholderRenderer.js';
import type { WorldActorRenderSnapshot } from '../../world/worldActorsRenderSnapshot.js';
import type { WorldStructureRenderSnapshot } from '../../world/worldStructureRenderSnapshot.js';
import { CITY_01_MAP_CONFIG } from './MapConfig.js';

const NPC_ID_LABELS: Record<string, string> = {
  npc_anciao: 'NPC · Ancião Cael',
  npc_mercenario: 'NPC · Mercenário',
  npc_ferreiro: 'NPC · Ferreiro',
  npc_vendedor: 'NPC · Loja NPC',
  npc_alquimista: 'NPC · Alquimista',
  npc_banqueiro: 'NPC · Banqueiro',
  npc_instrutor_refraction: 'NPC · Instrutor Kael',
};

/** Label de debug para prédio/prop — prioriza registry de placeholders. */
export function resolveStructureDebugLabel(snapshot: WorldStructureRenderSnapshot): string {
  if (snapshot.kind === 'portal') {
    return `Portal · ${snapshot.assetKey}`;
  }

  const fromRegistry = PLACEHOLDER_ASSET_REGISTRY[snapshot.assetKey]?.label;
  if (fromRegistry) {
    return fromRegistry;
  }

  const fromMap = CITY_01_MAP_CONFIG.structureMarkers.find(
    (marker) => marker.id === snapshot.assetKey,
  )?.label;
  if (fromMap) {
    return fromMap;
  }

  return snapshot.assetKey.replace(/_/g, ' ').toUpperCase();
}

/** Label para NPC / spawn de criatura (debug squares). */
export function resolveActorDebugLabel(actor: WorldActorRenderSnapshot): string {
  if (actor.kind === 'npc') {
    return NPC_ID_LABELS[actor.npcId] ?? `NPC · ${actor.npcId}`;
  }

  return `Spawn · ${actor.creatureId}`;
}

/** Cor de debug por categoria — Game Designer ajusta aqui. */
export function resolveStructureDebugColors(snapshot: WorldStructureRenderSnapshot): {
  readonly fill: number;
  readonly stroke: number;
} {
  if (snapshot.kind === 'portal') {
    return { fill: 0x5eead4, stroke: 0x99f6e4 };
  }

  const type = PLACEHOLDER_ASSET_REGISTRY[snapshot.assetKey]?.type;
  if (type === 'NPC_SPOT') {
    return { fill: 0x7ec8ff, stroke: 0xa8dcff };
  }
  if (type === 'INTERACTIVE_OBJ' || snapshot.assetKey.includes('market')) {
    return { fill: 0xf0d040, stroke: 0xc8a820 };
  }
  if (type === 'BUILDING' || type === 'TOWER_BUILDING') {
    return { fill: 0x4a4a4a, stroke: 0x9a9a9a };
  }

  return { fill: 0x6a5a4a, stroke: 0x9a8a7a };
}

export function resolveActorDebugColors(actor: WorldActorRenderSnapshot): {
  readonly fill: number;
  readonly stroke: number;
} {
  if (actor.kind === 'npc') {
    return { fill: 0x7ec8ff, stroke: 0xc8ecff };
  }
  return { fill: 0xff6b8a, stroke: 0xff9ab0 };
}
