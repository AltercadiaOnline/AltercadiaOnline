/**
 * Gera src/game/generated/meuPackAssetsRegistry.ts a partir de public/assets/meu-pack
 * Uso: npm run generate:meu-pack
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_CONFIG } from '../src/game/constants/GameConfig.js';
import {
  buildMeuPackAssetId,
  buildMeuPackAssetPublicUrl,
  classifySmartAssetCategory,
  resolveSmartAssetCollision,
  resolveSmartAssetDepthSort,
  type SmartAssetCategory,
} from '../src/game/assets/smartAssetClassification.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoot = path.join(root, 'public', 'assets', 'meu-pack');
const outDir = path.join(root, 'src', 'game', 'generated');
const outFile = path.join(outDir, 'meuPackAssetsRegistry.ts');

const IMAGE_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);

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

function isImageFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
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

    if (!isImageFile(name)) {
      continue;
    }

    const category = classifySmartAssetCategory(relative, name);
    const id = ensureUniqueId(buildMeuPackAssetId(relative, name));

    assets.push({
      id,
      fileName: name,
      relativePath: relative,
      url: buildMeuPackAssetPublicUrl(relative, name),
      category,
      width: TILE,
      height: TILE,
      collision: resolveSmartAssetCollision(category),
      depthSort: resolveSmartAssetDepthSort(category),
    });
  }
}

if (!existsSync(scanRoot)) {
  mkdirSync(scanRoot, { recursive: true });
  console.warn(`[generate:meu-pack] Pasta criada (vazia): ${scanRoot}`);
  console.warn('[generate:meu-pack] Coloque PNGs em public/assets/meu-pack/ e rode de novo.');
} else {
  walk(scanRoot);
}

assets.sort((left, right) => left.id.localeCompare(right.id));

const terrain = assets.filter((asset) => asset.category === 'TILE_TERRAIN');
const structure = assets.filter((asset) => asset.category === 'TILE_STRUCTURE');
const props = assets.filter((asset) => asset.category === 'ENTITY_PROP');

mkdirSync(outDir, { recursive: true });

const fileContents = `/** Gerado por scripts/generate-meu-pack-registry.ts — não editar manualmente. */
import type { SmartAssetCategory } from '../assets/smartAssetClassification.js';

export type GeneratedMeuPackAsset = {
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

export const GENERATED_MEU_PACK_ASSETS: readonly GeneratedMeuPackAsset[] = ${JSON.stringify(assets, null, 2)} as const;

export const GENERATED_MEU_PACK_ASSET_STATS = {
  total: ${assets.length},
  terrain: ${terrain.length},
  structure: ${structure.length},
  props: ${props.length},
} as const;
`;

writeFileSync(outFile, fileContents, 'utf8');

console.log(`[generate:meu-pack] ${assets.length} imagens → ${outFile}`);
console.log(`  Terreno: ${terrain.length} | Estrutura: ${structure.length} | Props: ${props.length}`);

if (assets.length > 0) {
  const sample = (items: readonly ScannedAsset[], limit = 8): string =>
    items.slice(0, limit).map((item) => item.fileName).join(', ')
      + (items.length > limit ? ` … (+${items.length - limit})` : '');

  console.log(`  [Terreno] ${sample(terrain)}`);
  console.log(`  [Estrutura] ${sample(structure)}`);
  console.log(`  [Props] ${sample(props)}`);
}
