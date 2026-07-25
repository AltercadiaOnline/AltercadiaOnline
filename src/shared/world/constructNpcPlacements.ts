import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { MapId } from './mapRegistry.js';
import type { NpcRegistryEntry } from './npcRegistry.js';
import {
  getNpcAssetFrameSize,
  resolveNpcCollisionSize,
} from '../npc/npcAssetBundles.js';
import { CONSTRUCT_NPC_PLACEMENTS_GENERATED } from './constructNpcPlacements.generated.js';

/**
 * Posições dos markers Construct — origem = centro do objeto (ox/oy 0.5).
 * Dados: constructNpcPlacements.generated.ts (npm run generate:construct-placements).
 */
export type ConstructNpcPlacement = {
  readonly mapId: MapId;
  readonly constructX: number;
  readonly constructY: number;
};

/** Placements gerados do data.json — única autoridade de posição NPC. */
export const CONSTRUCT_NPC_PLACEMENTS: Readonly<Record<string, ConstructNpcPlacement>> =
  CONSTRUCT_NPC_PLACEMENTS_GENERATED;

/** ObjectTypes Construct de NPCs/terminais — esconder (overlay desenha o PNG). */
export const CONSTRUCT_NPC_MARKER_TYPES = [
  'npc_anciao_cael',
  'npc_banqueiro',
  'npc_ferreiro',
  'npc_alquimista',
  'npc_vendedor',
  'npc_treinador_pet',
  'npc_mestre_trilhas',
  'npc_mercenario',
  'computador_arena',
  'computador_marketplace',
  'computador_zona1',
  'pulpito',
  'combate_pvp',
] as const;

export function hasConstructNpcPlacement(npcId: string, mapId?: MapId): boolean {
  const placement = CONSTRUCT_NPC_PLACEMENTS[npcId];
  if (!placement) return false;
  if (mapId !== undefined && placement.mapId !== mapId) return false;
  return true;
}

/**
 * Centro Construct → posição lógica do registry.
 * worldX/Y = centro do tile lógico; pés = worldY + TILE/2.
 * Com asset H, pés em constructY + H/2 (centro visual = marker).
 */
export function constructMarkerToLogicalWorld(
  constructX: number,
  constructY: number,
  assetHeight: number = DESIGN_CONFIG.TILE.SIZE,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { readonly worldX: number; readonly worldY: number; readonly tileX: number; readonly tileY: number } {
  const feetY = constructY + assetHeight / 2;
  const worldX = Math.round(constructX);
  const worldY = Math.round(feetY - tileSize / 2);
  return {
    worldX,
    worldY,
    tileX: Math.floor(constructX / tileSize),
    tileY: Math.floor(feetY / tileSize),
  };
}

export function constructNpcCollisionHitbox(
  npcId: string,
  placement: ConstructNpcPlacement,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const frame = getNpcAssetFrameSize(npcId) ?? { width: 35, height: 54 };
  const size = resolveNpcCollisionSize(npcId);
  // Marker Construct = centro visual; colisão ancorada nos pés do sprite.
  const markerBottom = placement.constructY + frame.height / 2;
  return {
    x: Math.round(placement.constructX - size.width / 2),
    y: Math.round(markerBottom - size.height),
    width: size.width,
    height: size.height,
  };
}

/** Aplica placement Construct — sobrescreve tile/world/dimensions. */
export function applyConstructNpcPlacement(entry: NpcRegistryEntry): NpcRegistryEntry {
  const placement = CONSTRUCT_NPC_PLACEMENTS[entry.id];
  if (!placement || placement.mapId !== entry.mapId) {
    return entry;
  }

  const frame = getNpcAssetFrameSize(entry.id);
  const assetHeight = frame?.height ?? entry.dimensions.height;
  const assetWidth = frame?.width ?? entry.dimensions.width;
  const resolved = constructMarkerToLogicalWorld(
    placement.constructX,
    placement.constructY,
    assetHeight,
  );

  return {
    ...entry,
    tileX: resolved.tileX,
    tileY: resolved.tileY,
    worldX: resolved.worldX,
    worldY: resolved.worldY,
    dimensions: { width: assetWidth, height: assetHeight },
  };
}
