import { DESIGN_CONFIG } from '../../config/designConstants.js';
import {
  isTiledMapEnabled,
  resolveTiledMapDescriptor,
} from '../../config/tiledMapManifest.js';
import { isTiledVisualTileLayer } from '../../shared/world/tiledMapLayers.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { resolveTiledPublicAssetUrl } from '../phaser/tiled/tiledAssetPaths.js';
import type { Camera } from '../scenes/Camera.js';
import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';

const TILED_GID_MASK = 0x1fffffff;

type ParsedTileset = {
  readonly firstgid: number;
  readonly lastgid: number;
  readonly tilewidth: number;
  readonly tileheight: number;
  readonly columns: number;
  readonly margin: number;
  readonly spacing: number;
  readonly imageUrl: string;
};

const imageByUrl = new Map<string, HTMLImageElement | null>();
const pendingByUrl = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageByUrl.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pendingByUrl.get(url);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageByUrl.set(url, img);
      pendingByUrl.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      imageByUrl.set(url, null);
      pendingByUrl.delete(url);
      resolve(null);
    };
    img.src = url;
  });

  pendingByUrl.set(url, promise);
  return promise;
}

function parseTilesets(mapId: MapId): ParsedTileset[] {
  const descriptor = resolveTiledMapDescriptor(mapId);
  const raw = descriptor?.phaserMapData?.tilesets;
  if (!descriptor || !Array.isArray(raw)) return [];

  const sorted = [...raw]
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .sort((left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0));

  return sorted
    .map((entry, index) => {
      const firstgid = Number(entry.firstgid ?? 0);
      const nextFirstGid = sorted[index + 1]?.firstgid as number | undefined;
      const tilecount = Number(entry.tilecount ?? 1);
      const lastgid = nextFirstGid != null && nextFirstGid > firstgid
        ? nextFirstGid - 1
        : firstgid + Math.max(1, tilecount) - 1;
      const imagePath = typeof entry.image === 'string' ? entry.image : '';
      if (!imagePath) return null;

      return {
        firstgid,
        lastgid,
        tilewidth: Number(entry.tilewidth ?? DESIGN_CONFIG.TILE.SIZE),
        tileheight: Number(entry.tileheight ?? DESIGN_CONFIG.TILE.SIZE),
        columns: Math.max(1, Number(entry.columns ?? 1)),
        margin: Number(entry.margin ?? 0),
        spacing: Number(entry.spacing ?? 0),
        imageUrl: resolveTiledPublicAssetUrl(descriptor.jsonUrl, imagePath),
      } satisfies ParsedTileset;
    })
    .filter((entry): entry is ParsedTileset => entry !== null);
}

function resolveTilesetForGid(gid: number, tilesets: readonly ParsedTileset[]): ParsedTileset | null {
  for (let index = tilesets.length - 1; index >= 0; index -= 1) {
    const tileset = tilesets[index]!;
    if (gid >= tileset.firstgid && gid <= tileset.lastgid) {
      return tileset;
    }
  }
  return null;
}

/** Pré-carrega PNGs do export Tiled (JSON espelho) para fallback canvas. */
export function preloadTiledMapCanvasAssets(mapId: MapId): void {
  if (!isTiledMapEnabled(mapId)) return;
  for (const tileset of parseTilesets(mapId)) {
    void loadImage(tileset.imageUrl);
  }
}

/**
 * Desenha tile layers do export Tiled no canvas legado — lê o JSON do mapa (não tile solto).
 * Usado quando o Phaser não monta o mapa (tilesets 48/128px, imagens não múltiplas de 32, etc.).
 */
export function renderTiledMapGroundFromExport(
  ctx: CanvasRenderingContext2D,
  mapId: MapId,
  camera: Camera,
): boolean {
  const descriptor = resolveTiledMapDescriptor(mapId);
  const mapData = descriptor?.phaserMapData;
  if (!descriptor || !mapData) return false;

  const mapTileWidth = Number(mapData.tilewidth ?? DESIGN_CONFIG.TILE.SIZE);
  const mapTileHeight = Number(mapData.tileheight ?? DESIGN_CONFIG.TILE.SIZE);
  const mapWidthTiles = Number(mapData.width ?? DESIGN_CONFIG.MAP.MAX_TILES_WIDTH);
  const mapHeightTiles = Number(mapData.height ?? DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT);
  const tilesets = parseTilesets(mapId).filter(
    (tileset) => tileset.tilewidth === mapTileWidth && tileset.tileheight === mapTileHeight,
  );

  if (tilesets.length === 0) return false;

  disableCanvasImageSmoothing(ctx);

  const pad = 2;
  const startX = Math.max(0, Math.floor(camera.x / mapTileWidth) - pad);
  const startY = Math.max(0, Math.floor(camera.y / mapTileHeight) - pad);
  const endX = Math.min(
    mapWidthTiles,
    Math.ceil((camera.x + camera.visibleWorldWidth) / mapTileWidth) + pad,
  );
  const endY = Math.min(
    mapHeightTiles,
    Math.ceil((camera.y + camera.visibleWorldHeight) / mapTileHeight) + pad,
  );

  const layers = Array.isArray(mapData.layers) ? mapData.layers : [];
  let drewAny = false;

  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') continue;
    const entry = layer as Record<string, unknown>;
    if (entry.type !== 'tilelayer' || !Array.isArray(entry.data)) continue;
    if (typeof entry.name !== 'string' || !isTiledVisualTileLayer(entry.name)) continue;

    const data = entry.data as number[];
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const raw = data[y * mapWidthTiles + x];
        if (typeof raw !== 'number') continue;

        const gid = raw & TILED_GID_MASK;
        if (gid <= 0) continue;

        const tileset = resolveTilesetForGid(gid, tilesets);
        if (!tileset) continue;

        const image = imageByUrl.get(tileset.imageUrl);
        if (!image?.complete || image.naturalWidth <= 0) {
          void loadImage(tileset.imageUrl);
          continue;
        }

        const localId = gid - tileset.firstgid;
        const col = localId % tileset.columns;
        const row = Math.floor(localId / tileset.columns);
        const sx = tileset.margin + col * (tileset.tilewidth + tileset.spacing);
        const sy = tileset.margin + row * (tileset.tileheight + tileset.spacing);
        const dx = x * mapTileWidth;
        const dy = y * mapTileHeight;

        ctx.drawImage(
          image,
          sx,
          sy,
          tileset.tilewidth,
          tileset.tileheight,
          dx,
          dy,
          mapTileWidth,
          mapTileHeight,
        );
        drewAny = true;
      }
    }
  }

  return drewAny;
}
