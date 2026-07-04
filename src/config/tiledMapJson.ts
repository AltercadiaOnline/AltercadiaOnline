import type { TiledTilesetDescriptor } from './tiledMapManifest.js';
import {
  readTiledObjectProperty as readSharedTiledObjectProperty,
  type TiledObjectPropertySource,
} from '../shared/world/tiledMapObject.js';

export type TiledJsonTileset = {
  readonly name: string;
  readonly image?: string;
};

export type TiledJsonObject = TiledObjectPropertySource & {
  readonly type?: string;
  readonly gid?: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly visible?: boolean;
  readonly rotation?: number;
};

export type TiledJsonLayer = {
  readonly name: string;
  readonly type: string;
  readonly visible?: boolean;
  readonly objects?: readonly TiledJsonObject[];
};

export type TiledMapJson = {
  readonly tilesets: readonly TiledJsonTileset[];
  readonly layers?: readonly TiledJsonLayer[];
};

/** Objeto Tiled pronto para o parser do Phaser (`Formats.TILED_JSON`). */
export type PhaserReadyTiledMap = Record<string, unknown>;

const TILED_GID_MASK = 0x1fffffff;
const TILED_FLIP_MASK = ~TILED_GID_MASK;

type RawTileset = Record<string, unknown> & {
  readonly firstgid?: number;
  readonly tilewidth?: number;
  readonly tileheight?: number;
  readonly tilecount?: number;
  readonly imagewidth?: number;
  readonly imageheight?: number;
  readonly columns?: number;
  readonly margin?: number;
  readonly spacing?: number;
};

function resolveTilesetGidMax(firstgid: number, nextFirstGid: number | undefined): number {
  if (nextFirstGid != null && nextFirstGid > firstgid) {
    return nextFirstGid - 1;
  }
  return firstgid;
}

/** Tilesets de props (48×48, 128×128, …) não podem entrar em tile layers 32×32 — quebram o Phaser. */
function listNonGridTilesetGidRanges(
  tilesets: readonly RawTileset[],
  mapTileWidth: number,
  mapTileHeight: number,
): Array<{ minGid: number; maxGid: number }> {
  const sorted = [...tilesets]
    .filter((tileset) => typeof tileset.firstgid === 'number')
    .sort((left, right) => Number(left.firstgid) - Number(right.firstgid));

  const ranges: Array<{ minGid: number; maxGid: number }> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const tileset = sorted[index]!;
    const tileWidth = Number(tileset.tilewidth ?? mapTileWidth);
    const tileHeight = Number(tileset.tileheight ?? mapTileHeight);
    if (tileWidth === mapTileWidth && tileHeight === mapTileHeight) {
      continue;
    }

    const firstgid = Number(tileset.firstgid);
    const nextFirstGid = sorted[index + 1]?.firstgid as number | undefined;
    ranges.push({
      minGid: firstgid,
      maxGid: resolveTilesetGidMax(firstgid, nextFirstGid),
    });
  }

  return ranges;
}

function stripNonGridGidsFromTileLayers(
  layers: unknown,
  ranges: readonly { minGid: number; maxGid: number }[],
): unknown {
  if (!Array.isArray(layers)) {
    return layers;
  }

  return layers.map((layer) => {
    if (!layer || typeof layer !== 'object') {
      return layer;
    }

    const entry = { ...(layer as Record<string, unknown>) };
    if (entry.type !== 'tilelayer' || !Array.isArray(entry.data)) {
      return entry;
    }

    entry.data = (entry.data as number[]).map((raw) => {
      const gid = Number(raw) & TILED_GID_MASK;
      if (gid <= 0) {
        return raw;
      }

      const blocked = ranges.some((range) => gid >= range.minGid && gid <= range.maxGid);
      if (!blocked) {
        return raw;
      }

      return Number(raw) & TILED_FLIP_MASK;
    });

    return entry;
  });
}

function enrichTilesetForPhaser(
  tileset: RawTileset,
  nextFirstGid: number | undefined,
  mapTileWidth: number,
  mapTileHeight: number,
): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...tileset };
  delete enriched.source;

  const firstgid = Number(enriched.firstgid ?? 1);
  const tileWidth = Number(enriched.tilewidth ?? mapTileWidth);
  const tileHeight = Number(enriched.tileheight ?? mapTileHeight);
  enriched.tilewidth = tileWidth;
  enriched.tileheight = tileHeight;

  const inferredTileCount = resolveTilesetGidMax(firstgid, nextFirstGid) - firstgid + 1;
  const tilecount = typeof enriched.tilecount === 'number' && enriched.tilecount > 0
    ? enriched.tilecount
    : inferredTileCount;
  enriched.tilecount = Math.max(1, tilecount);

  const margin = Number(enriched.margin ?? 0);
  const spacing = Number(enriched.spacing ?? 0);

  let columns = typeof enriched.columns === 'number' ? enriched.columns : 0;
  if (columns <= 0) {
    if (typeof enriched.imagewidth === 'number' && enriched.imagewidth > 0) {
      columns = Math.max(
        1,
        Math.floor((enriched.imagewidth - 2 * margin + spacing) / (tileWidth + spacing)),
      );
    } else {
      columns = 1;
    }
    enriched.columns = columns;
  }

  if (typeof enriched.imagewidth !== 'number' || enriched.imagewidth <= 0) {
    enriched.imagewidth = columns * tileWidth
      + 2 * margin
      + (columns - 1) * spacing;
  }

  if (typeof enriched.imageheight !== 'number' || enriched.imageheight <= 0) {
    const rows = Math.max(1, Math.ceil(Number(enriched.tilecount) / columns));
    enriched.imageheight = rows * tileHeight
      + 2 * margin
      + (rows - 1) * spacing;
  }

  return enriched;
}

/**
 * O Phaser 4 IGNORA qualquer tileset que tenha o campo `source` (tileset externo .tsx)
 * — ver node_modules/phaser/src/tilemaps/parsers/tiled/ParseTilesets.js. O espelho
 * (`src/config/maps/*.json`) é enriquecido com `image`/`name`, mas mantém `source`,
 * então precisamos removê-lo para o Phaser embutir o tileset e renderizar os tiles.
 *
 * Props com tile size ≠ grid (48/64/128/144 px) são removidos das tile layers — ficam
 * só nas object layers — evitando `AssignTileProperties` crash (gid sem índice).
 */
export function buildPhaserTiledMapData(json: TiledMapJson): PhaserReadyTiledMap {
  const source = json as unknown as Record<string, unknown>;
  const mapTileWidth = Number(source.tilewidth ?? 32);
  const mapTileHeight = Number(source.tileheight ?? 32);

  const rawTilesets = (Array.isArray(source.tilesets) ? source.tilesets : []) as RawTileset[];
  const sortedTilesets = [...rawTilesets].sort(
    (left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0),
  );

  const tilesets = sortedTilesets.map((entry, index) => {
    const nextFirstGid = sortedTilesets[index + 1]?.firstgid as number | undefined;
    return enrichTilesetForPhaser(entry, nextFirstGid, mapTileWidth, mapTileHeight);
  });

  const nonGridRanges = listNonGridTilesetGidRanges(tilesets, mapTileWidth, mapTileHeight);
  const layers = stripNonGridGidsFromTileLayers(source.layers, nonGridRanges);

  return {
    ...source,
    tilesets,
    layers,
  };
}

/** Tilesets declarados no export Tiled — fonte única para preload (sem lista manual). */
export function extractTilesetsFromTiledJson(json: TiledMapJson): TiledTilesetDescriptor[] {
  const seen = new Set<string>();

  return json.tilesets
    .filter((tileset) => typeof tileset.image === 'string' && tileset.image.length > 0)
    .filter((tileset) => {
      if (seen.has(tileset.name)) return false;
      seen.add(tileset.name);
      return true;
    })
    .map((tileset) => ({
      name: tileset.name,
      imagePath: tileset.image!,
    }));
}

export function listTiledObjectGroupLayers(json: TiledMapJson): readonly TiledJsonLayer[] {
  return (json.layers ?? []).filter((layer) => layer.type === 'objectgroup');
}

export function readTiledObjectProperty(
  object: TiledObjectPropertySource,
  propertyName: string,
): string | number | boolean | undefined {
  return readSharedTiledObjectProperty(object, propertyName);
}

/** PNGs soltos referenciados por propriedade `image` em object layers (structures/props). */
export function extractObjectImagePathsFromTiledJson(json: TiledMapJson): string[] {
  const paths = new Set<string>();

  for (const layer of listTiledObjectGroupLayers(json)) {
    for (const object of layer.objects ?? []) {
      const imageProperty = readTiledObjectProperty(object, 'image');
      if (typeof imageProperty === 'string' && imageProperty.trim().length > 0) {
        paths.add(imageProperty.trim());
        continue;
      }

      if (typeof object.type === 'string') {
        const typeValue = object.type.trim();
        if (typeValue.includes('/') || typeValue.endsWith('.png')) {
          paths.add(typeValue);
        }
      }
    }
  }

  return [...paths];
}
