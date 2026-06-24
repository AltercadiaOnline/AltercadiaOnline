/**
 * Registro central de assets — atlas legado + pack testes.01.assets.free (auto-gerado).
 * Classificação por nomenclatura; escala forçada 40×40 via assetNormalizer.
 */

import { GAME_CONFIG } from './constants/GameConfig.js';
import {
  GENERATED_TEST_ASSETS,
  GENERATED_TEST_ASSET_STATS,
  type GeneratedTestAsset,
} from './generated/testAssetsRegistry.js';
import {
  classifySmartAssetCategory,
  type SmartAssetCategory,
} from './assets/smartAssetClassification.js';
import {
  CITY_01_TEST_PACK_WIRING_STATS,
  resolveTestPackGameKey,
} from './generated/city01TestPackWiring.js';

export const TILESET_ATLAS_FILE = 'tileset_v1.png';
export const TILESET_ATLAS_URL = `/assets/tilesets/${TILESET_ATLAS_FILE}`;

/** @deprecated Use SmartAssetCategory — mantido para atlas legado. */
export type AssetCategory = 'tileset' | 'entity' | 'character';

export type AssetFrame = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly category: AssetCategory;
  readonly originX?: number;
  readonly originY?: number;
};

export type RegistryAssetSource = 'atlas' | 'file';

export type RegistryAsset = {
  readonly id: string;
  readonly fileName: string;
  readonly category: SmartAssetCategory;
  readonly width: number;
  readonly height: number;
  readonly collision: boolean;
  readonly depthSort: boolean;
  readonly originX: number;
  readonly originY: number;
  readonly source: RegistryAssetSource;
  readonly url?: string;
  readonly atlasFrame?: AssetFrame;
};

export type LegacyAssetId =
  | 'chao_grama'
  | 'chao_praca'
  | 'chao_rua'
  | 'parede_concreto'
  | 'poste_metal'
  | 'lixeira'
  | 'correio'
  | 'hidrante'
  | 'banco'
  | 'extintor'
  | 'grafite'
  | 'player_idle'
  | 'npc_anciao'
  | 'npc_treinador'
  | 'npc_vendedor';

export type AssetId = LegacyAssetId | string;

export const TILESET_ATLAS_WIDTH = 384;
export const TILESET_ATLAS_HEIGHT = 256;

export const REGISTRY_TILE_SIZE = GAME_CONFIG.TILE_SIZE;

const ATLAS_FRAMES: Readonly<Record<LegacyAssetId, AssetFrame>> = {
  chao_grama: { x: 0, y: 0, width: 40, height: 40, category: 'tileset', originX: 0, originY: 0 },
  chao_praca: { x: 40, y: 0, width: 40, height: 40, category: 'tileset', originX: 0, originY: 0 },
  chao_rua: { x: 80, y: 0, width: 40, height: 40, category: 'tileset', originX: 0, originY: 0 },
  parede_concreto: { x: 120, y: 0, width: 40, height: 40, category: 'tileset', originX: 0, originY: 0 },
  poste_metal: { x: 0, y: 40, width: 40, height: 80, category: 'entity', originX: 0.5, originY: 1 },
  lixeira: { x: 40, y: 80, width: 40, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  correio: { x: 80, y: 80, width: 40, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  hidrante: { x: 120, y: 80, width: 40, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  extintor: { x: 160, y: 80, width: 40, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  banco: { x: 0, y: 120, width: 80, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  grafite: { x: 80, y: 120, width: 40, height: 40, category: 'entity', originX: 0.5, originY: 1 },
  player_idle: { x: 160, y: 0, width: 40, height: 40, category: 'character', originX: 0.5, originY: 1 },
  npc_anciao: { x: 200, y: 0, width: 40, height: 40, category: 'character', originX: 0.5, originY: 1 },
  npc_treinador: { x: 240, y: 0, width: 40, height: 40, category: 'character', originX: 0.5, originY: 1 },
  npc_vendedor: { x: 280, y: 0, width: 40, height: 40, category: 'character', originX: 0.5, originY: 1 },
};

const LEGACY_ALIASES: Readonly<Record<string, LegacyAssetId>> = {
  ground_grass: 'chao_grama',
  ground_plaza: 'chao_praca',
  ground_road: 'chao_rua',
  GRASS: 'chao_grama',
  PLAZA: 'chao_praca',
  ROAD_TILE: 'chao_rua',
  street_light: 'poste_metal',
  trash_can: 'lixeira',
  mailbox: 'correio',
  fire_hydrant: 'hidrante',
  park_bench: 'banco',
  fire_extinguisher: 'extintor',
  graffiti_wall: 'grafite',
  npc_treinador: 'npc_treinador',
  npc_vendedor: 'npc_vendedor',
};

const TEST_ASSET_BY_ID = new Map<string, GeneratedTestAsset>(
  GENERATED_TEST_ASSETS.map((asset) => [asset.id, asset]),
);

const TEST_ASSET_BY_FILE = new Map<string, GeneratedTestAsset>();
for (const asset of GENERATED_TEST_ASSETS) {
  const key = asset.fileName.toLowerCase();
  if (!TEST_ASSET_BY_FILE.has(key)) {
    TEST_ASSET_BY_FILE.set(key, asset);
  }
}

let verificationLogged = false;

function mapLegacyCategory(frame: AssetFrame): SmartAssetCategory {
  if (frame.category === 'tileset') return 'TILE_TERRAIN';
  if (frame.category === 'entity') return 'ENTITY_PROP';
  return 'ENTITY_PROP';
}

function legacyToRegistry(id: LegacyAssetId, frame: AssetFrame): RegistryAsset {
  const category = mapLegacyCategory(frame);
  const isTerrain = category === 'TILE_TERRAIN';

  return {
    id,
    fileName: `${id}.png`,
    category,
    width: isTerrain ? REGISTRY_TILE_SIZE : frame.width,
    height: isTerrain ? REGISTRY_TILE_SIZE : frame.height,
    collision: category === 'TILE_STRUCTURE',
    depthSort: category === 'ENTITY_PROP',
    originX: frame.originX ?? (isTerrain ? 0 : 0.5),
    originY: frame.originY ?? (isTerrain ? 0 : 1),
    source: 'atlas',
    atlasFrame: frame,
  };
}

function testToRegistry(asset: GeneratedTestAsset): RegistryAsset {
  const isTerrain = asset.category === 'TILE_TERRAIN';

  return {
    id: asset.id,
    fileName: asset.fileName,
    category: asset.category,
    width: REGISTRY_TILE_SIZE,
    height: REGISTRY_TILE_SIZE,
    collision: asset.collision,
    depthSort: asset.depthSort,
    originX: isTerrain ? 0 : 0.5,
    originY: isTerrain ? 0 : 1,
    source: 'file',
    url: asset.url,
  };
}

function resolveLegacyId(key: string): LegacyAssetId | null {
  if (key in ATLAS_FRAMES) {
    return key as LegacyAssetId;
  }
  return LEGACY_ALIASES[key] ?? null;
}

export function classifyAssetByName(relativePath: string, fileName: string): SmartAssetCategory {
  return classifySmartAssetCategory(relativePath, fileName);
}

export function resolveAssetId(key: string): string | null {
  const wired = resolveTestPackGameKey(key);
  if (wired) return wired;
  if (TEST_ASSET_BY_ID.has(key)) return key;
  const byFile = TEST_ASSET_BY_FILE.get(key.toLowerCase());
  if (byFile) return byFile.id;
  const legacy = resolveLegacyId(key);
  if (legacy) return legacy;
  return null;
}

/** Retorna definição unificada — pack de testes, atlas legado ou PNG individual. */
export function getRegistryAsset(assetKey: string): RegistryAsset | null {
  const wiredId = resolveTestPackGameKey(assetKey);
  if (wiredId) {
    const wiredAsset = TEST_ASSET_BY_ID.get(wiredId);
    if (wiredAsset) return testToRegistry(wiredAsset);
  }

  const directTest = TEST_ASSET_BY_ID.get(assetKey)
    ?? TEST_ASSET_BY_FILE.get(assetKey.toLowerCase());
  if (directTest) {
    return testToRegistry(directTest);
  }

  const legacyId = resolveLegacyId(assetKey);
  if (legacyId) {
    return legacyToRegistry(legacyId, ATLAS_FRAMES[legacyId]);
  }

  return null;
}

/** Compat — retorna frame do atlas quando aplicável. */
export function get(assetKey: string): AssetFrame | null {
  const asset = getRegistryAsset(assetKey);
  if (!asset) return null;
  if (asset.source === 'atlas' && asset.atlasFrame) {
    return asset.atlasFrame;
  }

  return {
    x: 0,
    y: 0,
    width: asset.width,
    height: asset.height,
    category: asset.category === 'TILE_TERRAIN' ? 'tileset' : 'entity',
    originX: asset.originX,
    originY: asset.originY,
  };
}

export function getAssetFrame(id: LegacyAssetId): AssetFrame {
  return ATLAS_FRAMES[id];
}

export function listAssetIds(): readonly string[] {
  return [
    ...Object.keys(ATLAS_FRAMES),
    ...GENERATED_TEST_ASSETS.map((asset) => asset.id),
  ];
}

export function listRegistryAssets(): readonly RegistryAsset[] {
  const legacy = (Object.keys(ATLAS_FRAMES) as LegacyAssetId[]).map((id) =>
    legacyToRegistry(id, ATLAS_FRAMES[id]),
  );
  const generated = GENERATED_TEST_ASSETS.map(testToRegistry);
  return [...legacy, ...generated];
}

export function listAssetsByCategory(category: SmartAssetCategory): readonly RegistryAsset[] {
  return listRegistryAssets().filter((asset) => asset.category === category);
}

export function resolveAssetOrigin(
  asset: {
    readonly originX?: number;
    readonly originY?: number;
    readonly category?: SmartAssetCategory | AssetCategory;
  },
): { readonly x: number; readonly y: number } {
  const isTerrain = asset.category === 'TILE_TERRAIN' || asset.category === 'tileset';
  return {
    x: asset.originX ?? (isTerrain ? 0 : 0.5),
    y: asset.originY ?? (isTerrain ? 0 : 1),
  };
}

/** Log único no browser — verificação do catálogo testes.01.assets.free. */
export function logAssetRegistryVerification(): void {
  if (verificationLogged || typeof console === 'undefined') {
    return;
  }
  verificationLogged = true;

  const terrain = GENERATED_TEST_ASSETS.filter((a) => a.category === 'TILE_TERRAIN');
  const structure = GENERATED_TEST_ASSETS.filter((a) => a.category === 'TILE_STRUCTURE');
  const props = GENERATED_TEST_ASSETS.filter((a) => a.category === 'ENTITY_PROP');

  const formatNames = (items: readonly GeneratedTestAsset[], limit = 24): string =>
    items.slice(0, limit).map((item) => item.fileName).join(', ')
      + (items.length > limit ? ` … (+${items.length - limit})` : '');

  console.group('[AssetRegistry] Catálogo testes.01.assets.free');
  console.log(`Total: ${GENERATED_TEST_ASSET_STATS.total} PNGs @ ${REGISTRY_TILE_SIZE}×${REGISTRY_TILE_SIZE}px (escala forçada)`);
  console.log(`Terreno (${terrain.length}):`, formatNames(terrain));
  console.log(`Estrutura (${structure.length}, colisão ON):`, formatNames(structure));
  console.log(`Props (${props.length}, depth sort ON):`, formatNames(props));
  console.log(
    `[City01 wiring] aliases=${CITY_01_TEST_PACK_WIRING_STATS.gameKeyAliases} `
    + `decorativos=${CITY_01_TEST_PACK_WIRING_STATS.decorativeProps} `
    + `paredes=${CITY_01_TEST_PACK_WIRING_STATS.wallProps}`,
  );
  console.groupEnd();
}

export { GENERATED_TEST_ASSET_STATS };
