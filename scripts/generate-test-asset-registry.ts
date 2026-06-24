/**
 * Gera src/game/generated/testAssetsRegistry.ts a partir de public/assets/testes.01.assets.free
 * Uso: npm run generate:test-assets
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_CONFIG } from '../src/game/constants/GameConfig.js';
import {
  buildTestAssetId,
  buildTestAssetPublicUrl,
  classifySmartAssetCategory,
  resolveSmartAssetCollision,
  resolveSmartAssetDepthSort,
  type SmartAssetCategory,
} from '../src/game/assets/smartAssetClassification.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoot = path.join(root, 'public', 'assets', 'testes.01.assets.free');
const outDir = path.join(root, 'src', 'game', 'generated');
const outFile = path.join(outDir, 'testAssetsRegistry.ts');

type ScannedAsset = {
  readonly id: string;
  readonly fileName: string;
  readonly relativePath: string;
  readonly url: string;
  readonly category: SmartAssetCategory;
  readonly width: number;
  readonly height: number;
  readonly collision: boolean;
  readonly depthSort: boolean;
};

const TILE = GAME_CONFIG.TILE_SIZE;
const seenIds = new Map<string, number>();
const assets: ScannedAsset[] = [];

function ensureUniqueId(baseId: string): string {
  const count = seenIds.get(baseId) ?? 0;
  seenIds.set(baseId, count + 1);
  if (count === 0) return baseId;
  return `${baseId}_${count + 1}`;
}

function walk(directory: string, relative = ''): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith('.') || name.startsWith('__MACOSX') || name.endsWith('.zip')) {
      continue;
    }

    const absolute = path.join(directory, name);
    const rel = relative ? `${relative}/${name}` : name;

    if (entry.isDirectory()) {
      walk(absolute, rel);
      continue;
    }

    if (!name.toLowerCase().endsWith('.png')) {
      continue;
    }

    const category = classifySmartAssetCategory(relative, name);
    const id = ensureUniqueId(buildTestAssetId(relative, name));

    assets.push({
      id,
      fileName: name,
      relativePath: relative,
      url: buildTestAssetPublicUrl(relative, name),
      category,
      width: TILE,
      height: TILE,
      collision: resolveSmartAssetCollision(category),
      depthSort: resolveSmartAssetDepthSort(category),
    });
  }
}

walk(scanRoot);
assets.sort((left, right) => left.id.localeCompare(right.id));

const terrain = assets.filter((asset) => asset.category === 'TILE_TERRAIN');
const structure = assets.filter((asset) => asset.category === 'TILE_STRUCTURE');
const props = assets.filter((asset) => asset.category === 'ENTITY_PROP');

mkdirSync(outDir, { recursive: true });

const fileContents = `/** Gerado por scripts/generate-test-asset-registry.ts — não editar manualmente. */
import type { SmartAssetCategory } from '../assets/smartAssetClassification.js';

export type GeneratedTestAsset = {
  readonly id: string;
  readonly fileName: string;
  readonly relativePath: string;
  readonly url: string;
  readonly category: SmartAssetCategory;
  readonly width: number;
  readonly height: number;
  readonly collision: boolean;
  readonly depthSort: boolean;
};

export const GENERATED_TEST_ASSETS: readonly GeneratedTestAsset[] = ${JSON.stringify(assets, null, 2)} as const;

export const GENERATED_TEST_ASSET_STATS = {
  total: ${assets.length},
  terrain: ${terrain.length},
  structure: ${structure.length},
  props: ${props.length},
} as const;
`;

writeFileSync(outFile, fileContents, 'utf8');

console.log(`[generate:test-assets] ${assets.length} PNGs → ${outFile}`);
console.log(`  Terreno: ${terrain.length} | Estrutura: ${structure.length} | Props: ${props.length}`);
