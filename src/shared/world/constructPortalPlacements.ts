import { DESIGN_CONFIG } from '../../config/designConstants.js';

import type { MapId } from './mapRegistry.js';

import type { PortalPosition } from './portals.js';

import { CONSTRUCT_PORTAL_INSTANCES_GENERATED } from './constructPortalPlacements.generated.js';



/**

 * Markers de teleporte Construct — dados em constructPortalPlacements.generated.ts.

 * Não importa city01/farm_zone_01 (evita ciclo).

 */

export type ConstructPortalPlacement = {

  readonly mapId: MapId;

  readonly portalId: string;

  readonly constructLayout: string;

  readonly constructX: number;

  readonly constructY: number;

  readonly widthPx: number;

  readonly heightPx: number;

};



export const CONSTRUCT_PORTAL_INSTANCES: readonly ConstructPortalPlacement[] =

  CONSTRUCT_PORTAL_INSTANCES_GENERATED;



export type PortalTriggerTiles = {

  readonly tileX: number;

  readonly tileY: number;

  readonly tileW: number;

  readonly tileH: number;

};



export function findConstructPortalPlacement(

  portalId: string,

  constructLayout: string,

): ConstructPortalPlacement | undefined {

  return CONSTRUCT_PORTAL_INSTANCES.find(

    (entry) => entry.portalId === portalId && entry.constructLayout === constructLayout,

  );

}



/** @deprecated Prefer findConstructPortalPlacement — primeira instância do portalId. */

export function getConstructPortalPlacement(portalId: string): ConstructPortalPlacement | undefined {

  return CONSTRUCT_PORTAL_INSTANCES.find((entry) => entry.portalId === portalId);

}



/** Compat legado — mapa por portalId (primeira instância). */

export const CONSTRUCT_PORTAL_PLACEMENTS: Readonly<Record<string, ConstructPortalPlacement>> =

  Object.fromEntries(

    CONSTRUCT_PORTAL_INSTANCES.map((entry) => [entry.portalId, entry]),

  );



export function constructPortalToTriggerTiles(
  placement: ConstructPortalPlacement,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): PortalTriggerTiles {
  /** Marker Construct = centro do sprite invisível (origin 0.5) — gatilho 1×1 tile. */
  const centerTileX = Math.floor(placement.constructX / tileSize);
  const centerTileY = Math.floor(placement.constructY / tileSize);
  return {
    tileX: centerTileX,
    tileY: centerTileY,
    tileW: 1,
    tileH: 1,
  };
}



export function constructPortalArrivalTile(

  placement: ConstructPortalPlacement,

  offsetTiles: { readonly dx: number; readonly dy: number },

  tileSize: number = DESIGN_CONFIG.TILE.SIZE,

): PortalPosition {

  return {

    x: Math.floor(placement.constructX / tileSize) + offsetTiles.dx,

    y: Math.floor(placement.constructY / tileSize) + offsetTiles.dy,

  };

}

