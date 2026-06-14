import { getResolvedNpcRegistry, NPC_INTERACTION_RADIUS_TILES } from './npcRegistry.js';
import { MONSTER_REGISTRY } from './monsterRegistry.js';
import { getActiveMonstersForMap } from './worldMonsterInstances.js';
import { portalCenterTile, type Portal } from './portals.js';
import { getMapDefinition, type MapId } from './mapRegistry.js';
import { getWorldObjectsForMap } from './worldObjectRegistry.js';

export const InteractableKind = {
  NPC: 'npc',
  PORTAL: 'portal',
  MONSTER: 'monster',
  WORLD_OBJECT: 'world_object',
} as const;

export type InteractableKind = (typeof InteractableKind)[keyof typeof InteractableKind];

export type InteractableId = `${InteractableKind}:${string}`;

export type InteractableDefinition = {
  readonly id: InteractableId;
  readonly kind: InteractableKind;
  readonly mapId: MapId;
  /** Tile de referência para distância (centro do objeto ou da zona). */
  readonly tileX: number;
  readonly tileY: number;
  readonly label: string;
  readonly sourceId: string;
};

export const INTERACTION_RADIUS_TILES = NPC_INTERACTION_RADIUS_TILES;

export function buildInteractableId(kind: InteractableKind, sourceId: string): InteractableId {
  return `${kind}:${sourceId}`;
}

export function parseInteractableId(id: InteractableId): { kind: InteractableKind; sourceId: string } {
  const separator = id.indexOf(':');
  const kind = id.slice(0, separator) as InteractableKind;
  const sourceId = id.slice(separator + 1);
  return { kind, sourceId };
}

function portalReferenceTile(portal: Portal): { tileX: number; tileY: number } {
  const center = portalCenterTile(portal);
  return { tileX: center.x, tileY: center.y };
}

/** Registro data-driven de objetos clicáveis por mapa. */
export function buildInteractablesForMap(mapId: MapId): readonly InteractableDefinition[] {
  const mapDef = getMapDefinition(mapId);
  if (!mapDef) return [];

  const entries: InteractableDefinition[] = [];

  for (const npc of getResolvedNpcRegistry()) {
    if (npc.mapId !== mapId) continue;
    entries.push({
      id: buildInteractableId(InteractableKind.NPC, npc.id),
      kind: InteractableKind.NPC,
      mapId,
      tileX: npc.tileX,
      tileY: npc.tileY,
      label: npc.name,
      sourceId: npc.id,
    });
  }

  for (const portal of mapDef.portals) {
    const center = portalReferenceTile(portal);
    entries.push({
      id: buildInteractableId(InteractableKind.PORTAL, portal.id),
      kind: InteractableKind.PORTAL,
      mapId,
      tileX: center.tileX,
      tileY: center.tileY,
      label: portal.label,
      sourceId: portal.id,
    });
  }

  for (const monster of getActiveMonstersForMap(mapId)) {
    entries.push({
      id: buildInteractableId(InteractableKind.MONSTER, monster.id),
      kind: InteractableKind.MONSTER,
      mapId,
      tileX: monster.tileX,
      tileY: monster.tileY,
      label: monster.name,
      sourceId: monster.id,
    });
  }

  for (const monster of MONSTER_REGISTRY) {
    if (monster.mapId !== mapId) continue;
    if (entries.some((entry) => entry.sourceId === monster.id)) continue;
    entries.push({
      id: buildInteractableId(InteractableKind.MONSTER, monster.id),
      kind: InteractableKind.MONSTER,
      mapId,
      tileX: monster.tileX,
      tileY: monster.tileY,
      label: monster.name,
      sourceId: monster.id,
    });
  }

  for (const object of getWorldObjectsForMap(mapId)) {
    entries.push({
      id: buildInteractableId(InteractableKind.WORLD_OBJECT, object.id),
      kind: InteractableKind.WORLD_OBJECT,
      mapId,
      tileX: object.tileX,
      tileY: object.tileY,
      label: object.label,
      sourceId: object.id,
    });
  }

  return entries;
}

/** Prioridade ao carimbar tiles sobrepostos: portal > npc > monster. */
const KIND_PRIORITY: Record<InteractableKind, number> = {
  [InteractableKind.PORTAL]: 3,
  [InteractableKind.NPC]: 2,
  [InteractableKind.WORLD_OBJECT]: 2,
  [InteractableKind.MONSTER]: 1,
};

export function portalTiles(portal: Portal): ReadonlyArray<{ tileX: number; tileY: number }> {
  const center = portalReferenceTile(portal);
  return [{ tileX: center.tileX, tileY: center.tileY }];
}

export function isTileInPortalZone(portal: Portal, tileX: number, tileY: number): boolean {
  const center = portalReferenceTile(portal);
  return center.tileX === tileX && center.tileY === tileY;
}

export { KIND_PRIORITY };
