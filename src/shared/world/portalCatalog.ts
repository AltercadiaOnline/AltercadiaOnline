import { ZoneId } from '../items/itemTypes.js';
import type { MapId } from './mapRegistry.js';
import type { PortalDirection } from './portals.js';

/** Transição lógica portal Construct → mapa/layout de destino. */
export type PortalCatalogEntry = {
  readonly portalId: string;
  readonly label: string;
  readonly direction: PortalDirection;
  readonly sourceConstructLayout: string;
  readonly targetMapId: MapId;
  readonly targetConstructLayout: string;
  /** Marker de chegada no layout de destino (par do portal). */
  readonly arrivalPortalId: string;
  readonly arrivalOffset: { readonly dx: number; readonly dy: number };
  readonly targetZoneId?: ZoneId;
};

/** Tile de chegada quando o layout destino ainda não tem portal de retorno. */
export const PORTAL_ARRIVAL_FALLBACK_TILE: Readonly<
  Record<string, { readonly x: number; readonly y: number }>
> = {
  zonabeco1b: { x: 10, y: 37 },
  zonabeco1c: { x: 10, y: 37 },
};

export const PORTAL_CATALOG: readonly PortalCatalogEntry[] = [
  {
    portalId: 'city_portal_north',
    label: 'Beco dos Fundos',
    direction: 'north',
    sourceConstructLayout: 'cidade_01',
    targetMapId: 'farm_zone_01',
    targetConstructLayout: 'zonabeco1',
    arrivalPortalId: 'farm_portal_south',
    arrivalOffset: { dx: 0, dy: -2 },
    targetZoneId: ZoneId.Zone1,
  },
  {
    portalId: 'farm_portal_south',
    label: 'Retorno à Cidade',
    direction: 'south',
    sourceConstructLayout: 'zonabeco1',
    targetMapId: 'city_01',
    targetConstructLayout: 'cidade_01',
    arrivalPortalId: 'city_portal_north',
    arrivalOffset: { dx: 0, dy: 2 },
  },
  {
    portalId: 'farm_portal_z1_to_z1a',
    label: 'Subzona 1A',
    direction: 'north',
    sourceConstructLayout: 'zonabeco1',
    targetMapId: 'farm_zone_01',
    targetConstructLayout: 'zonabeco1a',
    arrivalPortalId: 'farm_portal_z1a_to_z1',
    arrivalOffset: { dx: 0, dy: 2 },
  },
  {
    portalId: 'farm_portal_z1a_to_z1',
    label: 'Beco Principal',
    direction: 'south',
    sourceConstructLayout: 'zonabeco1a',
    targetMapId: 'farm_zone_01',
    targetConstructLayout: 'zonabeco1',
    arrivalPortalId: 'farm_portal_z1_to_z1a',
    arrivalOffset: { dx: 0, dy: 2 },
  },
  {
    portalId: 'farm_portal_z1a_to_z1b',
    label: 'Subzona 1B',
    direction: 'west',
    sourceConstructLayout: 'zonabeco1a',
    targetMapId: 'farm_zone_01',
    targetConstructLayout: 'zonabeco1b',
    arrivalPortalId: 'farm_portal_z1a_to_z1b',
    arrivalOffset: { dx: 0, dy: 2 },
  },
  {
    portalId: 'farm_portal_z1a_to_z1c',
    label: 'Subzona 1C',
    direction: 'east',
    sourceConstructLayout: 'zonabeco1a',
    targetMapId: 'farm_zone_01',
    targetConstructLayout: 'zonabeco1c',
    arrivalPortalId: 'farm_portal_z1a_to_z1c',
    arrivalOffset: { dx: 0, dy: 2 },
  },
];
