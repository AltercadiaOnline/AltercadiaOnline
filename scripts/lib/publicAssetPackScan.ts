/**
 * Varredura recursiva de packs em public/assets/{terrain,tilesets,combat,…}
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { GAME_CONFIG } from '../../src/game/constants/GameConfig.js';
import {
  buildScannedAssetId,
  buildScannedAssetPublicUrl,
  classifySmartAssetCategory,
  resolveSmartAssetCollision,
  resolveSmartAssetDepthSort,
  type SmartAssetCategory,
} from '../../src/game/assets/smartAssetClassification.js';

export type AssetPackScanRoot = {
  readonly packRoot: string;
  readonly idPrefix: string;
  readonly excludeRelativePaths?: readonly string[];
  readonly excludeFileNames?: readonly string[];
};

/** Pastas canônicas — assets fora de testes.01.assets.free */
export const PUBLIC_ASSET_PACK_SCAN_ROOTS: readonly AssetPackScanRoot[] = [
  { packRoot: 'terrain', idPrefix: 'terrain' },
  {
    packRoot: 'tilesets',
    idPrefix: 'tileset',
    excludeFileNames: ['tileset_v1.png', 'COUPON.png'],
  },
  { packRoot: 'combat', idPrefix: 'combat', excludeRelativePaths: ['icons'] },
  { packRoot: 'structures', idPrefix: 'structure' },
  { packRoot: 'urban', idPrefix: 'urban' },
  { packRoot: 'meu-pack', idPrefix: 'meu' },
] as const;

export type ScannedPackAsset = {
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

const TILE = GAME_CONFIG.TILE_SIZE;
const SKIP_DIR_NAMES = new Set(['__MACOSX', 'node_modules']);
const SKIP_FILE_NAMES = new Set(['COUPON.png']);

function shouldSkipEntry(name: string): boolean {
  return name.startsWith('.') || name.endsWith('.zip');
}

function isExcludedRelativePath(
  relativePath: string,
  excludeRelativePaths: readonly string[] | undefined,
): boolean {
  if (!excludeRelativePaths?.length) return false;
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  return excludeRelativePaths.some((segment) => {
    const needle = segment.toLowerCase();
    return normalized === needle || normalized.startsWith(`${needle}/`);
  });
}

function walkPack(
  assetsRoot: string,
  scanRoot: AssetPackScanRoot,
  directory: string,
  relative = '',
  seenIds: Map<string, number>,
  assets: ScannedPackAsset[],
): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = entry.name;
    if (shouldSkipEntry(name) || SKIP_DIR_NAMES.has(name)) {
      continue;
    }

    const absolute = path.join(directory, name);
    const rel = relative ? `${relative}/${name}` : name;

    if (entry.isDirectory()) {
      if (isExcludedRelativePath(rel, scanRoot.excludeRelativePaths)) {
        continue;
      }
      walkPack(assetsRoot, scanRoot, absolute, rel, seenIds, assets);
      continue;
    }

    if (!name.toLowerCase().endsWith('.png')) {
      continue;
    }

    if (SKIP_FILE_NAMES.has(name)) {
      continue;
    }

    if (scanRoot.excludeFileNames?.some((file) => file.toLowerCase() === name.toLowerCase())) {
      continue;
    }

    const classificationPath = `${scanRoot.packRoot}/${rel}`;
    const category = classifySmartAssetCategory(classificationPath, name);
    const baseId = buildScannedAssetId(scanRoot.idPrefix, rel, name);
    const count = seenIds.get(baseId) ?? 0;
    seenIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}_${count + 1}`;

    assets.push({
      id,
      packRoot: scanRoot.packRoot,
      fileName: name,
      relativePath: relative,
      url: buildScannedAssetPublicUrl(scanRoot.packRoot, relative, name),
      category,
      width: TILE,
      height: TILE,
      collision: resolveSmartAssetCollision(category),
      depthSort: resolveSmartAssetDepthSort(category),
    });
  }
}

export function scanPublicAssetPacks(
  roots: readonly AssetPackScanRoot[],
  assetsRoot: string,
): ScannedPackAsset[] {
  const assets: ScannedPackAsset[] = [];
  const seenIds = new Map<string, number>();

  for (const scanRoot of roots) {
    const directory = path.join(assetsRoot, scanRoot.packRoot);
    if (!existsSync(directory)) {
      continue;
    }
    walkPack(assetsRoot, scanRoot, directory, '', seenIds, assets);
  }

  assets.sort((left, right) => left.id.localeCompare(right.id));
  return assets;
}

export function summarizeScannedAssets(assets: readonly ScannedPackAsset[]): {
  total: number;
  terrain: number;
  structure: number;
  props: number;
  byPackRoot: Record<string, number>;
} {
  const byPackRoot: Record<string, number> = {};
  for (const asset of assets) {
    byPackRoot[asset.packRoot] = (byPackRoot[asset.packRoot] ?? 0) + 1;
  }

  return {
    total: assets.length,
    terrain: assets.filter((asset) => asset.category === 'TILE_TERRAIN').length,
    structure: assets.filter((asset) => asset.category === 'TILE_STRUCTURE').length,
    props: assets.filter((asset) => asset.category === 'ENTITY_PROP').length,
    byPackRoot,
  };
}
