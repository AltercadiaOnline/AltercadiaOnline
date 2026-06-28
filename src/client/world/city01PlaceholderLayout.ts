import { CITY_01_ID, CITY_01_PORTALS } from '../../shared/world/maps/city01.js';
import {
  CITY_01_MAP_TILES,
  CITY_01_COMMERCE_ZONE,
  CITY_01_RESIDENTIAL_ZONE,
  CITY_01_PLAZA_MAX,
  CITY_01_PLAZA_MIN,
  CITY_01_ARENA_CORE,
  CITY_01_ARENA_SPECTATOR_RING,
  CITY_01_ARENA_VISUAL,
  CITY_01_ROAD_NORTH_Y,
  CITY_01_ROAD_SOUTH_Y,
  CITY_01_ROAD_X_MAX,
  CITY_01_ROAD_X_MIN,
  CITY_01_ROAD_Y_MAX,
  CITY_01_ROAD_Y_MIN,
  CITY_01_STRUCTURE_DEFS,
  isCity01RoadNetworkTile,
} from '../../shared/world/maps/city01LayoutConstants.js';
import { getResolvedNpcRegistry } from '../../shared/world/npcRegistry.js';
import { getWorldObjectsForMap } from '../../shared/world/worldObjectRegistry.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { CITY_01_TOWER_STRUCTURE_DEFS } from '../../shared/world/maps/city01TowerLayout.js';
import { CITY_01_URBAN_PROP_DEFS } from '../../shared/world/maps/city01UrbanProps.js';
import {
  CITY_01_TEST_PACK_DECORATIVE_PROPS,
  CITY_01_TEST_PACK_WALL_PROPS,
} from '../../game/generated/city01TestPackWiring.js';
import { portalCenterTile, portalInteractionContains } from '../../shared/world/portals.js';
import {
  PlaceholderType,
  type PlaceholderTypeId,
} from './placeholderRenderer.js';
import { tileToWorldPixel } from './city01VisualLayout.js';

export type City01GroundKind = 'grass' | 'plaza';

export type City01MapCell = {
  readonly ground: City01GroundKind;
  readonly road: boolean;
};

export type City01PlaceholderEntity = {
  readonly assetKey: string;
  readonly type: PlaceholderTypeId;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
  /** Nível Z local (torre) — usado no Y-sort quando o jogador está na área. */
  readonly heightLevel?: number;
};

export type City01PlaceholderScene = {
  readonly mapTiles: number;
  readonly tileSize: number;
  readonly cells: readonly (readonly City01MapCell[])[];
  readonly entities: readonly City01PlaceholderEntity[];
  readonly npcSpots: readonly City01PlaceholderEntity[];
  readonly showDebugLayout: boolean;
  /** Camada lógica reservada para avatares espectadores (sistema TV futuro). */
  readonly spectatorRing: typeof CITY_01_ARENA_SPECTATOR_RING;
  readonly arenaVisual: typeof CITY_01_ARENA_VISUAL;
  readonly arenaCore: typeof CITY_01_ARENA_CORE;
};

export const CITY01_SHOW_DEBUG_LAYOUT = true;

const STRUCTURE_ASSET_KEYS: Readonly<Record<string, string>> = {
  food_block: 'food_stalls',
  market_block: 'market_hall',
  anciao_house: 'casa_anciao',
  mercenario_house: 'casa_mercenario',
  ferreiro_house: 'casa_ferreiro',
  vendedor_house: 'casa_vendedor',
  alquimista_house: 'casa_alquimista',
  banqueiro_house: 'casa_banqueiro',
};

const NPC_ASSET_KEYS: Readonly<Record<string, string>> = {
  anciao_cael: 'npc_anciao',
  mercenario: 'npc_mercenario',
  ferreiro: 'npc_ferreiro',
  vendedor: 'npc_vendedor',
  alquimista: 'npc_alquimista',
  banqueiro: 'npc_banqueiro',
  instrutor_refraction: 'npc_instrutor_refraction',
};

function isPlazaTile(tileX: number, tileY: number): boolean {
  return (
    tileX >= CITY_01_PLAZA_MIN &&
    tileX <= CITY_01_PLAZA_MAX &&
    tileY >= CITY_01_PLAZA_MIN &&
    tileY <= CITY_01_PLAZA_MAX
  );
}

function buildGroundGrid(mapTiles: number): City01MapCell[][] {
  const cells: City01MapCell[][] = [];

  for (let y = 0; y < mapTiles; y++) {
    const row: City01MapCell[] = [];
    for (let x = 0; x < mapTiles; x++) {
      const road = isCity01RoadNetworkTile(x, y);
      const ground: City01GroundKind =
        !road && isPlazaTile(x, y) ? 'plaza' : 'grass';
      row.push({ ground, road });
    }
    cells.push(row);
  }

  return cells;
}

function buildTowerEntities(): City01PlaceholderEntity[] {
  return CITY_01_TOWER_STRUCTURE_DEFS.map((structure) => ({
    assetKey: structure.assetKey,
    type: PlaceholderType.TOWER_BUILDING,
    label: structure.label,
    tileX: structure.tileX,
    tileY: structure.tileY,
    tileW: structure.tileW,
    tileH: structure.tileH,
    heightLevel: structure.heightLevel,
  }));
}

function buildStructureEntities(): City01PlaceholderEntity[] {
  return CITY_01_STRUCTURE_DEFS.map((structure) => {
    if (structure.id === 'refraction_booth') {
      return {
        assetKey: 'refraction_booth',
        type: PlaceholderType.REFRACTION_BOOTH,
        label: structure.label,
        tileX: structure.tileX,
        tileY: structure.tileY,
        tileW: structure.tileW,
        tileH: structure.tileH,
      };
    }
    const assetKey = STRUCTURE_ASSET_KEYS[structure.id] ?? structure.id;
    const isInteractive =
      structure.id === 'food_block' || structure.id === 'market_block';
    return {
      assetKey,
      type: isInteractive ? PlaceholderType.INTERACTIVE_OBJ : PlaceholderType.BUILDING,
      label: structure.label,
      tileX: structure.tileX,
      tileY: structure.tileY,
      tileW: structure.tileW,
      tileH: structure.tileH,
    };
  });
}

function buildWorldObjectEntities(): City01PlaceholderEntity[] {
  return getWorldObjectsForMap(CITY_01_ID).map((object) => ({
    assetKey: object.id,
    type: PlaceholderType.RANKING_MONITOR,
    label: object.label,
    tileX: object.tileX,
    tileY: object.tileY,
    tileW: object.tileW,
    tileH: object.tileH,
  }));
}

function buildNpcSpots(): City01PlaceholderEntity[] {
  return getResolvedNpcRegistry().filter((npc) => npc.mapId === CITY_01_ID).map((npc) => ({
    assetKey: NPC_ASSET_KEYS[npc.id] ?? `npc_${npc.id}`,
    type: PlaceholderType.NPC_SPOT,
    label: npc.name,
    tileX: npc.tileX,
    tileY: npc.tileY,
    tileW: 1,
    tileH: 1,
  }));
}

function buildTestPackPropEntities(): City01PlaceholderEntity[] {
  const decorative = CITY_01_TEST_PACK_DECORATIVE_PROPS.map((prop) => ({
    assetKey: prop.assetId,
    type: PlaceholderType.URBAN_PROP,
    label: prop.label,
    tileX: prop.tileX,
    tileY: prop.tileY,
    tileW: prop.tileW,
    tileH: prop.tileH,
  }));

  const walls = CITY_01_TEST_PACK_WALL_PROPS.map((prop) => ({
    assetKey: prop.assetId,
    type: PlaceholderType.BUILDING,
    label: prop.label,
    tileX: prop.tileX,
    tileY: prop.tileY,
    tileW: prop.tileW,
    tileH: prop.tileH,
  }));

  return [...decorative, ...walls];
}

function buildUrbanPropEntities(): City01PlaceholderEntity[] {
  return CITY_01_URBAN_PROP_DEFS.map((prop) => ({
    assetKey: prop.assetKey,
    type: PlaceholderType.URBAN_PROP,
    label: prop.label,
    tileX: prop.tileX,
    tileY: prop.tileY,
    tileW: prop.tileW,
    tileH: prop.tileH,
  }));
}

function buildPortalEntity(): City01PlaceholderEntity | null {
  const portal = CITY_01_PORTALS[0];
  if (!portal) return null;
  const center = portalCenterTile(portal);
  return {
    assetKey: 'portal_north',
    type: PlaceholderType.INTERACTIVE_OBJ,
    label: portal.label,
    tileX: center.x,
    tileY: center.y,
    tileW: 1,
    tileH: 1,
  };
}

/** Monta a cena data-driven — grade alinhada a CITY_01_MAP_TILES (40×40 @ 32px). */
export function buildCity01PlaceholderScene(mapTiles = CITY_01_MAP_TILES): City01PlaceholderScene {
  const entities = buildStructureEntities();
  entities.push(...buildTowerEntities());
  const portal = buildPortalEntity();
  if (portal) entities.push(portal);
  entities.push(...buildWorldObjectEntities());
  entities.push(...buildUrbanPropEntities());
  entities.push(...buildTestPackPropEntities());

  return {
    mapTiles,
    tileSize: DESIGN_CONFIG.TILE.SIZE,
    cells: buildGroundGrid(mapTiles),
    entities,
    npcSpots: buildNpcSpots(),
    showDebugLayout: CITY01_SHOW_DEBUG_LAYOUT,
    spectatorRing: CITY_01_ARENA_SPECTATOR_RING,
    arenaVisual: CITY_01_ARENA_VISUAL,
    arenaCore: CITY_01_ARENA_CORE,
  };
}

/** Verifica se um tile está dentro do footprint de alguma entidade (exceto ruas). */
export function entityAtTile(
  scene: City01PlaceholderScene,
  tileX: number,
  tileY: number,
): City01PlaceholderEntity | null {
  for (const entity of [...scene.entities, ...scene.npcSpots]) {
    if (
      tileX >= entity.tileX &&
      tileX < entity.tileX + entity.tileW &&
      tileY >= entity.tileY &&
      tileY < entity.tileY + entity.tileH
    ) {
      return entity;
    }
  }
  return null;
}

export function sceneTileToWorld(
  tileX: number,
  tileY: number,
  tileSize: number,
): { x: number; y: number } {
  return tileToWorldPixel(tileX, tileY, tileSize);
}

/** Constantes exportadas para testes de conectividade. */
export const CITY01_ROAD_NETWORK = {
  spineXMin: CITY_01_ROAD_X_MIN,
  spineXMax: CITY_01_ROAD_X_MAX,
  spineYMin: CITY_01_ROAD_NORTH_Y,
  spineYMax: CITY_01_ROAD_SOUTH_Y,
  branchYMin: CITY_01_ROAD_Y_MIN,
  branchYMax: CITY_01_ROAD_Y_MAX,
  residentialZone: CITY_01_RESIDENTIAL_ZONE,
  commerceZone: CITY_01_COMMERCE_ZONE,
} as const;

export function isPortalTile(tileX: number, tileY: number): boolean {
  return CITY_01_PORTALS.some((portal) => portalInteractionContains(portal, tileX, tileY));
}
