/**
 * Gera src/game/generated/testAssetsRegistry.ts a partir da estrutura canônica em public/assets/
 * (terrain, tilesets, combat, structures, urban — fora de testes.01.assets.free)
 * Uso: npm run generate:test-assets
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_ASSET_PACK_SCAN_ROOTS,
  scanPublicAssetPacks,
  summarizeScannedAssets,
} from './lib/publicAssetPackScan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(root, 'public', 'assets');
const outDir = path.join(root, 'src', 'game', 'generated');
const outFile = path.join(outDir, 'testAssetsRegistry.ts');

const scanRoots = PUBLIC_ASSET_PACK_SCAN_ROOTS.filter((entry) => entry.packRoot !== 'meu-pack');
const assets = scanPublicAssetPacks(scanRoots, assetsRoot);
const stats = summarizeScannedAssets(assets);

mkdirSync(outDir, { recursive: true });

const fileContents = `/** Gerado por scripts/generate-test-asset-registry.ts — não editar manualmente. */
import type { SmartAssetCategory } from '../assets/smartAssetClassification.js';

export type GeneratedTestAsset = {
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

export const GENERATED_TEST_ASSETS: readonly GeneratedTestAsset[] = ${JSON.stringify(assets, null, 2)} as const;

export const GENERATED_TEST_ASSET_STATS = {
  total: ${stats.total},
  terrain: ${stats.terrain},
  structure: ${stats.structure},
  props: ${stats.props},
  byPackRoot: ${JSON.stringify(stats.byPackRoot, null, 2)},
} as const;
`;

writeFileSync(outFile, fileContents, 'utf8');

console.log(`[generate:test-assets] ${assets.length} PNGs → ${outFile}`);
console.log(`  Terreno: ${stats.terrain} | Estrutura: ${stats.structure} | Props: ${stats.props}`);
for (const [packRoot, count] of Object.entries(stats.byPackRoot)) {
  console.log(`  [${packRoot}] ${count}`);
}
