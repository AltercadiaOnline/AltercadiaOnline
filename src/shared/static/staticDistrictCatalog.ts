import { CITY_01_ID } from '../world/maps/city01.js';
import {
  FARM_ZONE_01_ID,
} from '../world/maps/farm_zone_01.js';
import {
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_TILES_WIDE,
} from '../world/maps/farmZone01LayoutConstants.js';
import { CITY_01_MAP_TILES } from '../world/maps/city01LayoutConstants.js';
import type { MapId } from '../world/mapRegistry.js';

/** Distritos Static — AABB em tiles, sem overlap. */
export const STATIC_DISTRICT_IDS = [
  'city_north',
  'city_south',
  'farm_alley_north',
  'farm_alley_south',
] as const;

export type StaticDistrictId = (typeof STATIC_DISTRICT_IDS)[number];

export type StaticTileBounds = {
  readonly tileX0: number;
  readonly tileY0: number;
  readonly tileX1: number;
  readonly tileY1: number;
};

export type StaticDistrictDef = {
  readonly id: StaticDistrictId;
  readonly mapId: MapId;
  readonly label: string;
  readonly bounds: StaticTileBounds;
  /** Âncoras de patrulha (1–3) — spawn entra na fatia de agentes. */
  readonly agentHomeTiles: readonly { readonly tileX: number; readonly tileY: number }[];
  readonly sabotageGoal: number;
  readonly hotThreshold: number;
  readonly apagaoDurationMs: number;
};

export const STATIC_SABOTAGE_GOAL_DEFAULT = 10_000;
export const STATIC_HOT_THRESHOLD_DEFAULT = 5_000;
export const STATIC_APAGAO_DURATION_MS = 10 * 60 * 1000;
export const STATIC_AGENT_WAVE_COOLDOWN_MS = 7 * 60 * 1000;
export const STATIC_WAR_ROOM_MAX_SLOTS = 4;
export const STATIC_WAR_ROOM_EXPIRE_MS = 5 * 60 * 1000;
export const STATIC_FLEX_HEADLINE_MAX_CHARS = 120;

const CITY_MID_Y = Math.floor(CITY_01_MAP_TILES / 2);
const FARM_MID_Y = Math.floor(FARM_ZONE_01_TILES_HIGH / 2);
const FARM_MAX_X = FARM_ZONE_01_TILES_WIDE - 1;
const FARM_MAX_Y = FARM_ZONE_01_TILES_HIGH - 1;
const CITY_MAX = CITY_01_MAP_TILES - 1;

export const STATIC_DISTRICT_CATALOG: readonly StaticDistrictDef[] = [
  {
    id: 'city_north',
    mapId: CITY_01_ID,
    label: 'Cidade Norte — Praça / Arena',
    bounds: { tileX0: 0, tileY0: 0, tileX1: CITY_MAX, tileY1: CITY_MID_Y - 1 },
    agentHomeTiles: [
      { tileX: 19, tileY: 8 },
      { tileX: 14, tileY: 12 },
      { tileX: 25, tileY: 10 },
    ],
    sabotageGoal: STATIC_SABOTAGE_GOAL_DEFAULT,
    hotThreshold: STATIC_HOT_THRESHOLD_DEFAULT,
    apagaoDurationMs: STATIC_APAGAO_DURATION_MS,
  },
  {
    id: 'city_south',
    mapId: CITY_01_ID,
    label: 'Cidade Sul — Mercado',
    bounds: { tileX0: 0, tileY0: CITY_MID_Y, tileX1: CITY_MAX, tileY1: CITY_MAX },
    agentHomeTiles: [
      { tileX: 28, tileY: 28 },
      { tileX: 12, tileY: 32 },
      { tileX: 22, tileY: 24 },
    ],
    sabotageGoal: STATIC_SABOTAGE_GOAL_DEFAULT,
    hotThreshold: STATIC_HOT_THRESHOLD_DEFAULT,
    apagaoDurationMs: STATIC_APAGAO_DURATION_MS,
  },
  {
    id: 'farm_alley_north',
    mapId: FARM_ZONE_01_ID,
    label: 'Beco Norte',
    bounds: { tileX0: 0, tileY0: 0, tileX1: FARM_MAX_X, tileY1: FARM_MID_Y - 1 },
    agentHomeTiles: [
      { tileX: 8, tileY: 10 },
      { tileX: 18, tileY: 16 },
      { tileX: 12, tileY: 22 },
    ],
    sabotageGoal: STATIC_SABOTAGE_GOAL_DEFAULT,
    hotThreshold: STATIC_HOT_THRESHOLD_DEFAULT,
    apagaoDurationMs: STATIC_APAGAO_DURATION_MS,
  },
  {
    id: 'farm_alley_south',
    mapId: FARM_ZONE_01_ID,
    label: 'Beco Sul — Zona 1',
    bounds: { tileX0: 0, tileY0: FARM_MID_Y, tileX1: FARM_MAX_X, tileY1: FARM_MAX_Y },
    agentHomeTiles: [
      { tileX: 20, tileY: FARM_MID_Y + 8 },
      { tileX: 9, tileY: FARM_MID_Y + 14 },
      { tileX: 16, tileY: FARM_MID_Y + 20 },
    ],
    sabotageGoal: STATIC_SABOTAGE_GOAL_DEFAULT,
    hotThreshold: STATIC_HOT_THRESHOLD_DEFAULT,
    apagaoDurationMs: STATIC_APAGAO_DURATION_MS,
  },
] as const;

const districtById = new Map(STATIC_DISTRICT_CATALOG.map((entry) => [entry.id, entry]));

export function isStaticDistrictId(value: unknown): value is StaticDistrictId {
  return typeof value === 'string' && districtById.has(value as StaticDistrictId);
}

export function getStaticDistrictDef(id: string): StaticDistrictDef | null {
  return districtById.get(id as StaticDistrictId) ?? null;
}

export function listStaticDistrictsForMap(mapId: string): readonly StaticDistrictDef[] {
  return STATIC_DISTRICT_CATALOG.filter((entry) => entry.mapId === mapId);
}

function inBounds(bounds: StaticTileBounds, tileX: number, tileY: number): boolean {
  return tileX >= bounds.tileX0
    && tileX <= bounds.tileX1
    && tileY >= bounds.tileY0
    && tileY <= bounds.tileY1;
}

export function resolveStaticDistrictAt(
  mapId: string,
  tileX: number,
  tileY: number,
): StaticDistrictDef | null {
  for (const entry of STATIC_DISTRICT_CATALOG) {
    if (entry.mapId !== mapId) continue;
    if (inBounds(entry.bounds, tileX, tileY)) return entry;
  }
  return null;
}
