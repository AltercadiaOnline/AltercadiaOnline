/**
 * Gera wiring city01 ↔ packs em public/assets/{terrain,tilesets,combat,…}
 * Uso: npm run generate:city01-wiring
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITY_01_MAP_TILES, CITY_01_STRUCTURE_DEFS, isCity01RoadNetworkTile } from '../src/shared/world/maps/city01LayoutConstants.js';
import { CITY_01_PLAZA_MAX, CITY_01_PLAZA_MIN } from '../src/shared/world/maps/city01LayoutConstants.js';
import { CITY_01_URBAN_PROP_DEFS } from '../src/shared/world/maps/city01UrbanProps.js';
import { GENERATED_TEST_ASSETS, type GeneratedTestAsset } from '../src/game/generated/testAssetsRegistry.js';
import { URBAN_PROP_SPECS } from '../src/assets/urban/urbanAssetManifest.js';
import { STRUCTURE_ASSET_SPECS } from '../src/assets/structures/structureAssetManifest.js';
import { GROUND_TILE_SPECS } from '../src/assets/terrain/groundTileManifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'game', 'generated');
const outFile = path.join(outDir, 'city01TestPackWiring.ts');

type PropPlacement = {
  readonly assetId: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

const haystack = (asset: GeneratedTestAsset): string =>
  `${asset.relativePath}/${asset.fileName}`.toLowerCase();

function scoreBright(asset: GeneratedTestAsset): number {
  const h = haystack(asset);
  let score = 0;
  if (h.includes('/bright')) score += 4;
  if (h.includes('_pale') || h.includes('/pale')) score -= 3;
  if (h.includes('shadow')) score -= 2;
  return score;
}

function pickBest(
  assets: readonly GeneratedTestAsset[],
  predicate: (asset: GeneratedTestAsset) => boolean,
): GeneratedTestAsset | null {
  const matches = assets.filter(predicate);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => scoreBright(b) - scoreBright(a))[0] ?? null;
}

function pickByFileName(
  assets: readonly GeneratedTestAsset[],
  fileName: string,
): GeneratedTestAsset | null {
  return pickBest(assets, (asset) => asset.fileName.toLowerCase() === fileName.toLowerCase());
}

function pickByKeyword(
  assets: readonly GeneratedTestAsset[],
  keyword: string,
): GeneratedTestAsset | null {
  const kw = keyword.toLowerCase();
  return pickBest(assets, (asset) => haystack(asset).includes(kw));
}

const terrain = GENERATED_TEST_ASSETS.filter((a) => a.category === 'TILE_TERRAIN');
const structures = GENERATED_TEST_ASSETS.filter((a) => a.category === 'TILE_STRUCTURE');
const props = GENERATED_TEST_ASSETS.filter((a) => a.category === 'ENTITY_PROP');
const treeProps = props.filter((asset) => haystack(asset).includes('trees.tileset/'));
const plantProps = props.filter((asset) => {
  const h = haystack(asset);
  if (!h.includes('plants.tileset/')) return false;
  if (!h.includes('/png/assets/')) return false;
  if (h.includes('assets_shadow')) return false;
  if (h.includes('_source')) return false;
  // Árvores canônicas ficam em trees.tileset — aqui só arbustos/flores/samambaias/cactos.
  if (h.includes('_tree')) return false;
  return true;
});

const gameKeyAliases: Record<string, string> = {};

function wire(key: string, asset: GeneratedTestAsset | null): void {
  if (!asset) return;
  gameKeyAliases[key] = asset.id;
}

// —— Terreno canônico ——
for (const spec of GROUND_TILE_SPECS) {
  if (spec.id === 'ground_road') {
    wire('ground_road', pickByFileName(terrain, 'road.png') ?? pickByKeyword(terrain, 'road&border'));
  }
  if (spec.id === 'ground_plaza') {
    const plaza = pickByFileName(terrain, 'crosswalk.png') ?? pickByKeyword(terrain, 'crosswalk');
    wire('ground_plaza', plaza);
  }
  if (spec.id === 'ground_grass') {
    const grass = pickByKeyword(terrain, 'floor')
      ?? pickByKeyword(terrain, 'grass')
      ?? pickByKeyword(terrain, 'ground')
      ?? pickByFileName(terrain, 'City1.png');
    wire('ground_grass', grass);
  }
}

// Re-wire ROAD_TILE/PLAZA/GRASS with resolved ids
if (gameKeyAliases.ground_road) gameKeyAliases.ROAD_TILE = gameKeyAliases.ground_road;
if (gameKeyAliases.ground_plaza) gameKeyAliases.PLAZA = gameKeyAliases.ground_plaza;
if (gameKeyAliases.ground_grass) gameKeyAliases.GRASS = gameKeyAliases.ground_grass;

// Atlas legado → pack
wire('chao_rua', pickByFileName(terrain, 'road.png'));
wire('chao_praca', pickByFileName(terrain, 'crosswalk.png'));
wire('chao_grama', pickByKeyword(terrain, 'floor') ?? pickByFileName(terrain, 'City1.png'));

// —— Estruturas ——
const structurePool = [...structures].sort((a, b) => scoreBright(b) - scoreBright(a));
const structureFileSeen = new Set<string>();
const uniqueStructures = structurePool.filter((asset) => {
  const key = asset.fileName.toLowerCase();
  if (structureFileSeen.has(key)) return false;
  structureFileSeen.add(key);
  return true;
});

const structureGameKeys = STRUCTURE_ASSET_SPECS.map((spec) => spec.id);
let structureCursor = 0;
for (const gameKey of structureGameKeys) {
  const preferred = (() => {
    const h = gameKey.toLowerCase();
    if (h.includes('food') || h.includes('stall')) {
      return pickByKeyword(GENERATED_TEST_ASSETS, 'minishop') ?? pickByKeyword(GENERATED_TEST_ASSETS, 'shop');
    }
    if (h.includes('market') || h.includes('hall')) {
      return pickByFileName(structures, 'buildings.png') ?? pickByKeyword(structures, 'building');
    }
    if (h.includes('tower') || h.includes('spire')) {
      return pickByKeyword(structures, 'houses3') ?? pickByKeyword(structures, 'house');
    }
    if (h.includes('refraction') || h.includes('booth')) {
      return pickByKeyword(structures, 'houses2') ?? pickByKeyword(structures, 'house');
    }
    if (h.includes('arena')) {
      return pickByFileName(structures, 'buildings.png');
    }
    return pickByKeyword(structures, 'houses') ?? pickByKeyword(structures, 'house');
  })();
  const fallback = uniqueStructures[structureCursor % uniqueStructures.length] ?? null;
  if (preferred) {
    wire(gameKey, preferred);
  } else if (fallback) {
    wire(gameKey, fallback);
    structureCursor += 1;
  }
}

// Placeholder layout keys
const layoutStructureKeys: Record<string, string> = {
  food_block: 'food_stalls',
  market_block: 'market_hall',
  anciao_house: 'casa_anciao',
  mercenario_house: 'casa_mercenario',
  ferreiro_house: 'casa_ferreiro',
  vendedor_house: 'casa_vendedor',
  alquimista_house: 'casa_alquimista',
  banqueiro_house: 'casa_banqueiro',
};
for (const [layoutId, gameKey] of Object.entries(layoutStructureKeys)) {
  if (gameKeyAliases[gameKey]) {
    gameKeyAliases[layoutId] = gameKeyAliases[gameKey]!;
  }
}
wire('refraction_booth', pickByKeyword(structures, 'houses2') ?? uniqueStructures[0] ?? null);

// —— Props urbanos canônicos ——
const urbanKeywordMap: Record<string, string[]> = {
  street_light: ['road&lamps', 'lamp', 'lamps'],
  trash_can: ['container', 'box', 'boxes'],
  mailbox: ['callbox', 'shop', 'minishop'],
  fire_hydrant: ['hydrant'],
  park_bench: ['bench', 'umbrella', 'fountain&bush'],
  fire_extinguisher: ['hydrant', 'wheel'],
  graffiti_wall: ['wall', 'crack', 'cracks'],
};

for (const spec of URBAN_PROP_SPECS) {
  const keywords = urbanKeywordMap[spec.id] ?? [spec.id];
  let match: GeneratedTestAsset | null = null;
  for (const keyword of keywords) {
    match = pickByKeyword(GENERATED_TEST_ASSETS, keyword);
    if (match) break;
  }
  wire(spec.id, match);
}

// Atlas props legado
if (gameKeyAliases.street_light) gameKeyAliases.poste_metal = gameKeyAliases.street_light;
if (gameKeyAliases.trash_can) gameKeyAliases.lixeira = gameKeyAliases.trash_can;
if (gameKeyAliases.mailbox) gameKeyAliases.correio = gameKeyAliases.mailbox;
if (gameKeyAliases.fire_hydrant) gameKeyAliases.hidrante = gameKeyAliases.fire_hydrant;
if (gameKeyAliases.park_bench) gameKeyAliases.banco = gameKeyAliases.park_bench;
if (gameKeyAliases.fire_extinguisher) gameKeyAliases.extintor = gameKeyAliases.fire_extinguisher;
if (gameKeyAliases.graffiti_wall) gameKeyAliases.grafite = gameKeyAliases.graffiti_wall;

// —— Árvores canônicas ——
// Tudo que for árvore deve vir de public/assets/tilesets/trees.tileset. Preferimos
// Assets_no_shadow para não duplicar sombra projetada pelo motor.
function pickTreeByKeyword(keyword: string): GeneratedTestAsset | null {
  const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '');
  const kw = normalize(keyword);
  return pickBest(treeProps, (asset) => {
    const raw = haystack(asset);
    const h = normalize(raw);
    return raw.includes('assets_no_shadow') && h.includes(kw);
  }) ?? pickBest(treeProps, (asset) => normalize(haystack(asset)).includes(kw));
}

const treeAliases: Record<string, GeneratedTestAsset | null> = {
  tree_default: pickTreeByKeyword('blue-green_balls_tree1'),
  tree_blue_green: pickTreeByKeyword('blue-green_balls_tree1'),
  tree_willow: pickTreeByKeyword('willow1'),
  tree_mega: pickTreeByKeyword('mega_tree1'),
  tree_luminous: pickTreeByKeyword('luminous_tree1'),
  tree_curved: pickTreeByKeyword('curved_tree1'),
  tree_swirling: pickTreeByKeyword('swirling_tree1'),
  tree_white: pickTreeByKeyword('white_tree1'),
};

for (const [key, asset] of Object.entries(treeAliases)) {
  wire(key, asset);
}
if (gameKeyAliases.tree_default) {
  gameKeyAliases.tree = gameKeyAliases.tree_default;
  gameKeyAliases.arvore = gameKeyAliases.tree_default;
}

// —— Plantas canônicas ——
// Tudo que for planta (arbusto, flor, samambaia, cacto) vem de
// public/assets/tilesets/plants.tileset/PNG/Assets (sem sombra embutida).
function pickPlantByKeyword(keyword: string): GeneratedTestAsset | null {
  const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '');
  const kw = normalize(keyword);
  return pickBest(plantProps, (asset) => normalize(haystack(asset)).includes(kw));
}

const plantAliases: Record<string, GeneratedTestAsset | null> = {
  plant_default: pickPlantByKeyword('bush_simple1_1'),
  plant_bush_simple: pickPlantByKeyword('bush_simple1_2'),
  plant_bush_autumn: pickPlantByKeyword('autumn_bush1'),
  plant_bush_snow: pickPlantByKeyword('snow_bush1'),
  plant_flower_blue: pickPlantByKeyword('bush_blue_flowers1'),
  plant_flower_orange: pickPlantByKeyword('bush_orange_flowers1'),
  plant_flower_pink: pickPlantByKeyword('bush_pink_flowers1'),
  plant_flower_red: pickPlantByKeyword('bush_red_flowers1'),
  plant_fern: pickPlantByKeyword('fern1_1'),
  plant_cactus: pickPlantByKeyword('cactus1_1'),
  plant_cherry: pickPlantByKeyword('bush_pink_flowers2'),
};

for (const [key, asset] of Object.entries(plantAliases)) {
  wire(key, asset);
}
if (gameKeyAliases.plant_default) {
  gameKeyAliases.plant = gameKeyAliases.plant_default;
  gameKeyAliases.planta = gameKeyAliases.plant_default;
  gameKeyAliases.bush = gameKeyAliases.plant_default;
  gameKeyAliases.flor = gameKeyAliases.plant_default;
}

// —— Props decorativos: plantas do pack canônico ——
const usedAssetIds = new Set(Object.values(gameKeyAliases));
const decorativeAssets = plantProps.filter((asset) => !usedAssetIds.has(asset.id));

function isPlazaTile(tileX: number, tileY: number): boolean {
  return tileX >= CITY_01_PLAZA_MIN && tileX <= CITY_01_PLAZA_MAX
    && tileY >= CITY_01_PLAZA_MIN && tileY <= CITY_01_PLAZA_MAX;
}

function structureOccupies(tileX: number, tileY: number): boolean {
  return CITY_01_STRUCTURE_DEFS.some((structure) =>
    tileX >= structure.tileX
    && tileX < structure.tileX + structure.tileW
    && tileY >= structure.tileY
    && tileY < structure.tileY + structure.tileH,
  );
}

const reservedTiles = new Set<string>();
for (const prop of CITY_01_URBAN_PROP_DEFS) {
  for (let y = prop.tileY; y < prop.tileY + prop.tileH; y += 1) {
    for (let x = prop.tileX; x < prop.tileX + prop.tileW; x += 1) {
      reservedTiles.add(tileKey(x, y));
    }
  }
}

function tileKey(tileX: number, tileY: number): string {
  return `${tileX}:${tileY}`;
}

const candidateTiles: Array<{ tileX: number; tileY: number }> = [];
for (let y = 1; y < CITY_01_MAP_TILES - 1; y += 1) {
  for (let x = 1; x < CITY_01_MAP_TILES - 1; x += 1) {
    if (isCity01RoadNetworkTile(x, y)) continue;
    if (structureOccupies(x, y)) continue;
    if (isPlazaTile(x, y) && isCity01RoadNetworkTile(x, y)) continue;
    candidateTiles.push({ tileX: x, tileY: y });
  }
}

const decorativePlacements: PropPlacement[] = [];
let automaticDecorativePlaced = 0;
const fixedTreePlacements: readonly PropPlacement[] = [
  { assetId: 'tree_blue_green', label: 'Árvore azul-esverdeada', tileX: 6, tileY: 6, tileW: 2, tileH: 2 },
  { assetId: 'tree_willow', label: 'Salgueiro', tileX: 31, tileY: 8, tileW: 2, tileH: 2 },
  { assetId: 'tree_luminous', label: 'Árvore luminosa', tileX: 8, tileY: 31, tileW: 2, tileH: 2 },
  { assetId: 'tree_mega', label: 'Mega árvore', tileX: 30, tileY: 30, tileW: 3, tileH: 3 },
];
const fixedPlantPlacements: readonly PropPlacement[] = [
  { assetId: 'plant_cherry', label: 'Arbusto florido', tileX: CITY_01_PLAZA_MIN, tileY: CITY_01_PLAZA_MIN, tileW: 1, tileH: 1 },
  { assetId: 'plant_flower_pink', label: 'Flores rosas', tileX: CITY_01_PLAZA_MIN, tileY: CITY_01_PLAZA_MAX, tileW: 1, tileH: 1 },
  { assetId: 'plant_flower_red', label: 'Flores vermelhas', tileX: CITY_01_PLAZA_MAX, tileY: CITY_01_PLAZA_MIN, tileW: 1, tileH: 1 },
  { assetId: 'plant_flower_blue', label: 'Flores azuis', tileX: CITY_01_PLAZA_MAX, tileY: CITY_01_PLAZA_MAX, tileW: 1, tileH: 1 },
];

function canReserveFootprint(prop: PropPlacement, options?: { allowRoad?: boolean }): boolean {
  if (!gameKeyAliases[prop.assetId]) return false;
  for (let y = prop.tileY; y < prop.tileY + prop.tileH; y += 1) {
    for (let x = prop.tileX; x < prop.tileX + prop.tileW; x += 1) {
      if (x <= 0 || y <= 0 || x >= CITY_01_MAP_TILES - 1 || y >= CITY_01_MAP_TILES - 1) return false;
      if (!options?.allowRoad && isCity01RoadNetworkTile(x, y)) return false;
      if (structureOccupies(x, y)) return false;
      if (reservedTiles.has(tileKey(x, y))) return false;
    }
  }
  return true;
}

for (const prop of fixedTreePlacements) {
  if (!canReserveFootprint(prop)) continue;
  for (let y = prop.tileY; y < prop.tileY + prop.tileH; y += 1) {
    for (let x = prop.tileX; x < prop.tileX + prop.tileW; x += 1) {
      reservedTiles.add(tileKey(x, y));
    }
  }
  decorativePlacements.push(prop);
}

for (const prop of fixedPlantPlacements) {
  if (!canReserveFootprint(prop, { allowRoad: true })) continue;
  for (let y = prop.tileY; y < prop.tileY + prop.tileH; y += 1) {
    for (let x = prop.tileX; x < prop.tileX + prop.tileW; x += 1) {
      reservedTiles.add(tileKey(x, y));
    }
  }
  decorativePlacements.push(prop);
}

let tileIndex = 0;
for (const asset of decorativeAssets) {
  while (tileIndex < candidateTiles.length) {
    const { tileX, tileY } = candidateTiles[tileIndex]!;
    tileIndex += 1;
    const key = tileKey(tileX, tileY);
    if (reservedTiles.has(key)) continue;
    reservedTiles.add(key);
    decorativePlacements.push({
      assetId: asset.id,
      label: asset.fileName.replace(/\.png$/i, ''),
      tileX,
      tileY,
      tileW: 1,
      tileH: 1,
    });
    automaticDecorativePlaced += 1;
    break;
  }
}

// —— Paredes decorativas (TILE_STRUCTURE não usadas em edifícios) ——
const usedStructureIds = new Set(
  Object.values(gameKeyAliases).filter((id) =>
    structures.some((asset) => asset.id === id),
  ),
);
const wallAssets = structures.filter((asset) => !usedStructureIds.has(asset.id));
const wallPlacements: PropPlacement[] = [];
const wallRing: Array<{ tileX: number; tileY: number }> = [];
for (let x = 0; x < CITY_01_MAP_TILES; x += 1) {
  wallRing.push({ tileX: x, tileY: 0 }, { tileX: x, tileY: CITY_01_MAP_TILES - 1 });
}
for (let y = 1; y < CITY_01_MAP_TILES - 1; y += 1) {
  wallRing.push({ tileX: 0, tileY: y }, { tileX: CITY_01_MAP_TILES - 1, tileY: y });
}

for (let i = 0; i < wallAssets.length && i < wallRing.length; i += 1) {
  const pos = wallRing[i]!;
  if (isCity01RoadNetworkTile(pos.tileX, pos.tileY)) continue;
  wallPlacements.push({
    assetId: wallAssets[i]!.id,
    label: wallAssets[i]!.fileName.replace(/\.png$/i, ''),
    tileX: pos.tileX,
    tileY: pos.tileY,
    tileW: 1,
    tileH: 1,
  });
}

mkdirSync(outDir, { recursive: true });

const fileContents = `/** Gerado por scripts/generate-city01-test-pack-wiring.ts — não editar manualmente. */
export type City01TestPackPropPlacement = {
  readonly assetId: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/** Chave do jogo → id do asset nos packs canônicos de public/assets/ */
export const TEST_PACK_GAME_KEY_ALIASES: Readonly<Record<string, string>> = ${JSON.stringify(gameKeyAliases, null, 2)} as const;

export const CITY_01_TEST_PACK_DECORATIVE_PROPS: readonly City01TestPackPropPlacement[] = ${JSON.stringify(decorativePlacements, null, 2)} as const;

export const CITY_01_TEST_PACK_WALL_PROPS: readonly City01TestPackPropPlacement[] = ${JSON.stringify(wallPlacements, null, 2)} as const;

export const CITY_01_TEST_PACK_WIRING_STATS = {
  gameKeyAliases: ${Object.keys(gameKeyAliases).length},
  decorativeProps: ${decorativePlacements.length},
  wallProps: ${wallPlacements.length},
  decorativeSkipped: ${decorativeAssets.length - automaticDecorativePlaced},
} as const;

export function resolveTestPackGameKey(assetKey: string): string | null {
  return TEST_PACK_GAME_KEY_ALIASES[assetKey] ?? null;
}

export function listTestPackWiredAssetIds(): readonly string[] {
  const ids = new Set<string>(Object.values(TEST_PACK_GAME_KEY_ALIASES));
  for (const prop of CITY_01_TEST_PACK_DECORATIVE_PROPS) ids.add(prop.assetId);
  for (const prop of CITY_01_TEST_PACK_WALL_PROPS) ids.add(prop.assetId);
  return [...ids];
}
`;

writeFileSync(outFile, fileContents, 'utf8');

console.log(`[generate:city01-wiring] → ${outFile}`);
console.log(`  Aliases: ${Object.keys(gameKeyAliases).length}`);
console.log(`  Decorativos: ${decorativePlacements.length} (${automaticDecorativePlaced}/${decorativeAssets.length} automáticos)`);
console.log(`  Paredes perímetro: ${wallPlacements.length}/${wallAssets.length}`);
