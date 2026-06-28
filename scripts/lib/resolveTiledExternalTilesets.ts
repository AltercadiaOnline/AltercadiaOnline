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
};

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
        enriched.push({ ...tileset, name });
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
    enriched.push({
      ...tileset,
      name: resolved.name,
      image: resolved.imagePath,
      tilewidth: resolved.tilewidth,
      tileheight: resolved.tileheight,
    });
  }

  return enriched;
}
