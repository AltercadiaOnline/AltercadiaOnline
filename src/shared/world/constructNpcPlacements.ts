import { DESIGN_CONFIG } from '../../config/designConstants.js';

import type { MapId } from './mapRegistry.js';

import type { NpcRegistryEntry } from './npcRegistry.js';

import {

  getNpcAssetFrameSize,

  resolveNpcCollisionSize,

} from '../npc/npcAssetBundles.js';

import { resolveNpcArchetypeId } from '../npc/resolveNpcArchetypeId.js';

import {

  CONSTRUCT_NPC_INSTANCES_GENERATED,

  CONSTRUCT_NPC_PLACEMENTS_GENERATED,

} from './constructNpcPlacements.generated.js';

import { isConstructFarmLayoutActive } from './constructFarmLayouts.js';

import { listZoneDomainTerminalIds } from './zoneDomainTerminals.js';

import { ZONE_DOMAIN_TERMINAL_SPAWN_SOURCE } from './zoneDomainTerminalPlacements.js';

import npcConstructMarkers from '../../config/npcConstructMarkers.json' with { type: 'json' };



/**

 * Posições dos markers Construct — origem = centro do objeto (ox/oy 0.5).

 * Dados: constructNpcPlacements.generated.ts (npm run generate:construct-placements).

 */

export type ConstructNpcPlacement = {

  readonly mapId: MapId;

  readonly constructLayout?: string;

  readonly constructX: number;

  readonly constructY: number;

};



export type ConstructNpcInstancePlacement = ConstructNpcPlacement & {

  readonly instanceId: string;

  readonly archetypeId: string;

};



export const CONSTRUCT_NPC_INSTANCES: readonly ConstructNpcInstancePlacement[] =

  CONSTRUCT_NPC_INSTANCES_GENERATED;



/** Primeira instância por archetype — gates legados. */

export const CONSTRUCT_NPC_PLACEMENTS: Readonly<Record<string, ConstructNpcPlacement>> =

  CONSTRUCT_NPC_PLACEMENTS_GENERATED;



export { ZONE_DOMAIN_TERMINAL_SPAWN_SOURCE };



export function hasGeneratedConstructNpcPlacement(archetypeId: string): boolean {

  return Object.prototype.hasOwnProperty.call(CONSTRUCT_NPC_PLACEMENTS_GENERATED, archetypeId);

}



/** Instâncias visíveis no layout farm ativo (zonabeco1 até goToLayout de subzonas). */

export function listActiveConstructNpcInstances(): readonly ConstructNpcInstancePlacement[] {

  return CONSTRUCT_NPC_INSTANCES.filter((inst) => {

    if (inst.mapId !== 'farm_zone_01') return true;

    return isConstructFarmLayoutActive(inst.constructLayout ?? 'zonabeco1');

  });

}



export function getConstructNpcInstance(

  instanceId: string,

): ConstructNpcInstancePlacement | null {

  return CONSTRUCT_NPC_INSTANCES.find((inst) => inst.instanceId === instanceId) ?? null;

}



/** ObjectTypes Construct — esconder no bridge (overlay desenha o PNG). */

export const CONSTRUCT_NPC_MARKER_TYPES = [

  ...Object.keys(npcConstructMarkers),

  'combate_pvp',

] as const;



export function hasConstructNpcPlacement(instanceId: string, mapId?: MapId): boolean {

  const placement = getConstructNpcInstance(instanceId);

  if (!placement) return false;

  if (mapId !== undefined && placement.mapId !== mapId) return false;

  if (placement.mapId === 'farm_zone_01') {

    return isConstructFarmLayoutActive(placement.constructLayout ?? 'zonabeco1');

  }

  return true;

}



/**

 * Centro Construct → posição lógica do registry.

 * worldX/Y = centro do tile lógico; pés = worldY + TILE/2.

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

  instanceId: string,

  placement: ConstructNpcPlacement,

): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {

  const archetypeId = resolveNpcArchetypeId(instanceId);

  const frame = getNpcAssetFrameSize(archetypeId) ?? { width: 35, height: 54 };

  const size = resolveNpcCollisionSize(archetypeId);

  const markerBottom = placement.constructY + frame.height / 2;

  return {

    x: Math.round(placement.constructX - size.width / 2),

    y: Math.round(markerBottom - size.height),

    width: size.width,

    height: size.height,

  };

}



/** Aplica placement Construct — sobrescreve tile/world/dimensions. */

export function applyConstructNpcPlacement(

  entry: NpcRegistryEntry,

  placement: ConstructNpcPlacement,

): NpcRegistryEntry {

  const archetypeId = resolveNpcArchetypeId(entry.id);

  const frame = getNpcAssetFrameSize(archetypeId);

  const assetHeight = frame?.height ?? entry.dimensions.height;

  const assetWidth = frame?.width ?? entry.dimensions.width;

  const resolved = constructMarkerToLogicalWorld(

    placement.constructX,

    placement.constructY,

    assetHeight,

  );



  return {

    ...entry,

    mapId: placement.mapId,

    tileX: resolved.tileX,

    tileY: resolved.tileY,

    worldX: resolved.worldX,

    worldY: resolved.worldY,

    dimensions: { width: assetWidth, height: assetHeight },

  };

}



export function listConstructNpcMarkerTypesForTerminals(): readonly string[] {

  return listZoneDomainTerminalIds().filter((id) => id !== 'computador_zona1');

}


