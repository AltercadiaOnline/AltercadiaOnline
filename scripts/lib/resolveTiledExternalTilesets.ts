import { readFileSync } from 'node:fs';
import path from 'node:path';

export type ResolvedTiledTileset = {
  readonly name: string;
  readonly imagePath: string;
  readonly tilewidth: number;
  readonly tileheight: number;
};

type TiledMapTilesetRef = {
  readonly name?: string;
  readonly image?: string;
  readonly source?: string;
  readonly tilewidth?: number;
  readonly tileheight?: number;
  readonly margin?: number;
  readonly spacing?: number;
  readonly imagewidth?: number;
  readonly imageheight?: number;
  readonly tilecount?: number;
  readonly columns?: number;
};

/** Lê dimensões do chunk IHDR — evita depender de sharp/pngjs no mirror. */
export function readPngDimensions(absPath: string): { width: number; height: number } | null {
  try {
    const buffer = readFileSync(absPath);
    if (buffer.length < 24 || buffer.toString('latin1', 1, 4) !== 'PNG') {
      return null;
    }

    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

export function applyImageMetrics(
  tileset: TiledMapTilesetRef,
  imageAbsPath: string,
): TiledMapTilesetRef {
  const tilewidth = tileset.tilewidth ?? 32;
  const tileheight = tileset.tileheight ?? 32;
  const margin = tileset.margin ?? 0;
  const spacing = tileset.spacing ?? 0;
  const dimensions = readPngDimensions(imageAbsPath);

  if (!dimensions) {
    return tileset;
  }

  const columns = Math.max(
    1,
    Math.floor((dimensions.width - 2 * margin + spacing) / (tilewidth + spacing)),
  );
  const rows = Math.max(
    1,
    Math.floor((dimensions.height - 2 * margin + spacing) / (tileheight + spacing)),
  );

  return {
    ...tileset,
    imagewidth: dimensions.width,
    imageheight: dimensions.height,
    columns,
    tilecount: Math.max(1, columns * rows),
  };
}

/**
 * Resolve tilesets externos (.tsx) referenciados por exports em map_mund.
 * Retorna path da imagem relativo ao diretório do mapa (ex.: ../terrain/tiles/foo.png).
 */
export function resolveExternalTilesetImage(
  mapDirectory: string,
  sourcePath: string,
): ResolvedTiledTileset | null {
  const normalizedSource = sourcePath.replace(/\\/g, '/');
  const tsxPath = path.resolve(mapDirectory, normalizedSource);

  let xml: string;
  try {
    xml = readFileSync(tsxPath, 'utf8');
  } catch {
    console.warn('[resolveTiledExternalTilesets] TSX ausente:', tsxPath);
    return null;
  }

  const nameMatch = xml.match(/\bname="([^"]+)"/);
  const imageMatch = xml.match(/<image[^>]*\ssource="([^"]+)"/);
  const tileWidthMatch = xml.match(/\btilewidth="(\d+)"/);
  const tileHeightMatch = xml.match(/\btileheight="(\d+)"/);

  if (!nameMatch?.[1] || !imageMatch?.[1]) {
    console.warn('[resolveTiledExternalTilesets] TSX inválido (sem name/image):', tsxPath);
    return null;
  }

  const tsxDir = path.dirname(tsxPath);
  const imageAbs = path.resolve(tsxDir, imageMatch[1].replace(/\\/g, '/'));
  const imagePath = path.relative(mapDirectory, imageAbs).replace(/\\/g, '/');

  return {
    name: nameMatch[1],
    imagePath: imagePath.startsWith('.') ? imagePath : `./${imagePath}`,
    tilewidth: tileWidthMatch ? Number(tileWidthMatch[1]) : 32,
    tileheight: tileHeightMatch ? Number(tileHeightMatch[1]) : 32,
  };
}

/** Enriquece tilesets do export Tiled para preload (embedded image + name). */
export function enrichTilesetsForPreload(
  mapDirectory: string,
  tilesets: readonly TiledMapTilesetRef[] | undefined,
): TiledMapTilesetRef[] {
  const enriched: TiledMapTilesetRef[] = [];
  const seenNames = new Set<string>();

  for (const tileset of tilesets ?? []) {
    if (typeof tileset.image === 'string' && tileset.image.length > 0) {
      const name = tileset.name ?? path.basename(tileset.image, path.extname(tileset.image));
      if (!seenNames.has(name)) {
        seenNames.add(name);
        const imageAbs = path.resolve(mapDirectory, tileset.image.replace(/^\.\//, ''));
        enriched.push(applyImageMetrics({ ...tileset, name }, imageAbs));
      }
      continue;
    }

    if (typeof tileset.source !== 'string' || tileset.source.length === 0) {
      continue;
    }

    const resolved = resolveExternalTilesetImage(mapDirectory, tileset.source);
    if (!resolved || seenNames.has(resolved.name)) {
      continue;
    }

    seenNames.add(resolved.name);
    const imageAbs = path.resolve(mapDirectory, resolved.imagePath.replace(/^\.\//, ''));
    enriched.push(
      applyImageMetrics(
        {
          ...tileset,
          name: resolved.name,
          image: resolved.imagePath,
          tilewidth: resolved.tilewidth,
          tileheight: resolved.tileheight,
        },
        imageAbs,
      ),
    );
  }

  return enriched;
}
