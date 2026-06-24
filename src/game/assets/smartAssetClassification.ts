/**
 * Classificação inteligente por nomenclatura — testes.01.assets.free e futuros packs.
 */

export type SmartAssetCategory = 'TILE_TERRAIN' | 'TILE_STRUCTURE' | 'ENTITY_PROP';

export const TEST_ASSETS_PUBLIC_ROOT = '/assets/testes.01.assets.free';

const STRUCTURE_KEYWORDS = [
  'wall',
  'building',
  'buildings',
  'houses',
  'house',
  'bridge',
  'cracks_walls',
  'decorative_cracks',
] as const;

const TERRAIN_KEYWORDS = [
  'floor',
  'grass',
  'road',
  'path',
  'crosswalk',
  'ground',
] as const;

const PROP_KEYWORDS = [
  'prop',
  'bench',
  'bush',
  'mushroom',
  'cannon',
  'hydrant',
  'lamp',
  'container',
  'box',
  'fern',
  'cactus',
  'tree',
  'arrow',
  'flask',
  'wheel',
  'shop',
  'object',
  'sky',
  'city',
] as const;

function normalizeHaystack(relativePath: string, fileName: string): string {
  return `${relativePath}/${fileName}`.toLowerCase().replace(/\\/g, '/');
}

function includesKeyword(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword));
}

/**
 * Classifica um PNG pela nomenclatura e caminho relativo.
 * Prioridade: estrutura (colisão) → terreno → prop explícito → heurísticas de pasta.
 */
export function classifySmartAssetCategory(
  relativePath: string,
  fileName: string,
): SmartAssetCategory {
  const haystack = normalizeHaystack(relativePath, fileName);

  if (includesKeyword(haystack, STRUCTURE_KEYWORDS)) {
    return 'TILE_STRUCTURE';
  }

  if (includesKeyword(haystack, TERRAIN_KEYWORDS)) {
    return 'TILE_TERRAIN';
  }

  if (includesKeyword(haystack, PROP_KEYWORDS)) {
    return 'ENTITY_PROP';
  }

  if (haystack.includes('png_tiled') || haystack.includes('/tiled_files/')) {
    return 'TILE_TERRAIN';
  }

  if (haystack.includes('/assets/') || haystack.includes('/assets_no_shadow/')) {
    return 'ENTITY_PROP';
  }

  return 'ENTITY_PROP';
}

export function resolveSmartAssetCollision(category: SmartAssetCategory): boolean {
  return category === 'TILE_STRUCTURE';
}

export function resolveSmartAssetDepthSort(category: SmartAssetCategory): boolean {
  return category === 'ENTITY_PROP';
}

export function buildTestAssetPublicUrl(relativePath: string, fileName: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized ? `${normalized}/${fileName}` : fileName;
  return `${TEST_ASSETS_PUBLIC_ROOT}/${segments}`.replace(/\/+/g, '/');
}

export function buildTestAssetId(relativePath: string, fileName: string): string {
  const base = `${relativePath}/${fileName}`
    .replace(/\.png$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `test_${base}`.slice(0, 128);
}
