/**
 * Gera src/game/generated/meuPackAssetsRegistry.ts a partir de public/assets/meu-pack
 * Uso: npm run generate:meu-pack
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_ASSET_PACK_SCAN_ROOTS,
  scanPublicAssetPacks,
  summarizeScannedAssets,
} from './lib/publicAssetPackScan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(root, 'public', 'assets');
const scanRoot = path.join(assetsRoot, 'meu-pack');
const outDir = path.join(root, 'src', 'game', 'generated');
const outFile = path.join(outDir, 'meuPackAssetsRegistry.ts');

if (!existsSync(scanRoot)) {
  mkdirSync(scanRoot, { recursive: true });
  console.warn(`[generate:meu-pack] Pasta criada (vazia): ${scanRoot}`);
  console.warn('[generate:meu-pack] Coloque PNGs em public/assets/meu-pack/ e rode de novo.');
}

const meuPackRoot = PUBLIC_ASSET_PACK_SCAN_ROOTS.find((entry) => entry.packRoot === 'meu-pack');
const assets = meuPackRoot ? scanPublicAssetPacks([meuPackRoot], assetsRoot) : [];
const stats = summarizeScannedAssets(assets);

mkdirSync(outDir, { recursive: true });

const fileContents = `/** Gerado por scripts/generate-meu-pack-registry.ts — não editar manualmente. */
import type { SmartAssetCategory } from '../assets/smartAssetClassification.js';

export type GeneratedMeuPackAsset = {
  readonly id: string;
  readonly packRoot: string;
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
  total: ${stats.total},
  terrain: ${stats.terrain},
  structure: ${stats.structure},
  props: ${stats.props},
} as const;
`;

writeFileSync(outFile, fileContents, 'utf8');

console.log(`[generate:meu-pack] ${assets.length} imagens → ${outFile}`);
console.log(`  Terreno: ${stats.terrain} | Estrutura: ${stats.structure} | Props: ${stats.props}`);

if (assets.length > 0) {
  const sample = (items: typeof assets, limit = 8): string =>
    items.slice(0, limit).map((item) => item.fileName).join(', ')
      + (items.length > limit ? ` … (+${items.length - limit})` : '');

  console.log(`  [Terreno] ${sample(assets.filter((a) => a.category === 'TILE_TERRAIN'))}`);
  console.log(`  [Estrutura] ${sample(assets.filter((a) => a.category === 'TILE_STRUCTURE'))}`);
  console.log(`  [Props] ${sample(assets.filter((a) => a.category === 'ENTITY_PROP'))}`);
}
