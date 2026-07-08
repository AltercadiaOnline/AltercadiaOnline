import {
  resolveProcessedTilesetAsset,
  type ProcessedTilesetEntry,
} from '../../../config/processedAssetManifest.js';
import { ZONE1_TOPDOWN_CREATURES_ATLAS_KEY } from '../../../config/zone1ProcessedCreatureAtlas.js';

export const ROAD2_TILESET_NAME = 'Road2';

/** URL pública do PNG fonte referenciado no export Tiled (city_01). */
export const ROAD2_SOURCE_PUBLIC_URL =
  '/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road2.png';

/** Chave Phaser do atlas Road2 — usada em load.atlas e addTilesetImage. */
export const ROAD2_ATLAS_TEXTURE_KEY = 'road2_atlas';

/**
 * Chave Phaser do atlas processado — usa o basename do PNG (ex. Road1.png → processed:tileset:Road1).
 * Road2 usa sempre {@link ROAD2_ATLAS_TEXTURE_KEY} (`road2_atlas`).
 * O `name` no Tiled (ex. chao_madeira_Test) é só o 1º arg de addTilesetImage.
 */
export function processedTilesetAtlasKeyFromSourceUrl(sourcePublicUrl: string): string {
  const normalized = sourcePublicUrl.replace(/\\/g, '/');
  if (
    normalized === ROAD2_SOURCE_PUBLIC_URL
    || normalized.endsWith('/assets/processed/tilesets/Road2.png')
  ) {
    return ROAD2_ATLAS_TEXTURE_KEY;
  }
  const file = normalized.split('/').pop() ?? 'tileset';
  const base = file.replace(/\.[^.]+$/, '');
  return `processed:tileset:${base}`;
}

/** @deprecated Use processedTilesetAtlasKeyFromSourceUrl — o name no Tiled pode diferir do PNG. */
export function processedTilesetAtlasKey(tilesetName: string): string {
  return `processed:tileset:${tilesetName}`;
}

export function resolveProcessedTilesetForPublicUrl(
  publicUrl: string,
): ProcessedTilesetEntry | null {
  const normalized = publicUrl.replace(/\\/g, '/');
  return resolveProcessedTilesetAsset(normalized);
}

type AtlasLoadScene = {
  readonly textures: { exists: (key: string) => boolean };
  readonly load: {
    atlas?: (key: string, textureUrl: string, atlasUrl: string) => void;
    image: (key: string, url: string) => void;
  };
};

/**
 * Enfileira atlas processado (PNG + JSON) quando existir no manifest gerado.
 * Retorna a textureKey do atlas ou null se o tileset não tiver pipeline processado.
 */
export function queueProcessedTilesetAtlas(
  scene: AtlasLoadScene,
  sourcePublicUrl: string,
  queued: Set<string>,
): string | null {
  const processed = resolveProcessedTilesetForPublicUrl(sourcePublicUrl);
  if (!processed) return null;

  const atlasKey = processedTilesetAtlasKeyFromSourceUrl(sourcePublicUrl);
  if (queued.has(atlasKey)) return atlasKey;
  queued.add(atlasKey);

  if (scene.textures.exists(atlasKey)) {
    return atlasKey;
  }

  // Road2 e criaturas zone1: carregados exclusivamente na PreloaderScene.
  if (atlasKey === ROAD2_ATLAS_TEXTURE_KEY || atlasKey === ZONE1_TOPDOWN_CREATURES_ATLAS_KEY) {
    console.error(
      `[processedTilesetPreload] ${atlasKey} ausente no cache — PreloaderScene deve completar antes do mapa.`,
    );
    return atlasKey;
  }

  // Tilemap.addTilesetImage exige folha PNG contínua — load.atlas quebra tile layers (tela preta).
  scene.load.image(atlasKey, processed.imageUrl);
  return atlasKey;
}

/** Pré-carrega o atlas Road2 (PNG + JSON) — usado pela PreloaderScene. */
export function queueRoad2ProcessedAtlas(
  scene: AtlasLoadScene,
  queued: Set<string>,
): string {
  return queueProcessedTilesetAtlas(scene, ROAD2_SOURCE_PUBLIC_URL, queued)
    ?? ROAD2_ATLAS_TEXTURE_KEY;
}
