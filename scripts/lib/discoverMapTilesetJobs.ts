/**
 * Descobre tilesets 32×32 desalinhados referenciados pelos exports Tiled em map_mund/.
 * Só entram no pipeline sharp os PNGs que mapas reais usam — não o pack inteiro.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { MAP_MUND_EXPORT_REGISTRY } from '../../src/config/mapMundManifest.js';
import {
  readPngDimensions,
} from './resolveTiledExternalTilesets.js';

export type DiscoveredGridTilesetJob = {
  readonly id: string;
  readonly sourceRelative: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly columns: number;
  readonly tilecount: number;
  readonly mapIds: readonly string[];
};

type TsxMetadata = {
  readonly columns: number;
  readonly tilecount: number;
  readonly tilewidth: number;
  readonly tileheight: number;
};

function sanitizeJobId(sourceRelative: string): string {
  const base = path.basename(sourceRelative, path.extname(sourceRelative));
  const parent = path.basename(path.dirname(sourceRelative));
  const raw = parent && parent !== 'PNG_Tiled' ? `${parent}_${base}` : base;
  return raw.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_').slice(0, 64);
}

function parseTsxMetadata(tsxAbsPath: string): TsxMetadata | null {
  try {
    const xml = readFileSync(tsxAbsPath, 'utf8');
    const columns = Number(xml.match(/\bcolumns="(\d+)"/)?.[1] ?? 0);
    const tilecount = Number(xml.match(/\btilecount="(\d+)"/)?.[1] ?? 0);
    const tilewidth = Number(xml.match(/\btilewidth="(\d+)"/)?.[1] ?? 32);
    const tileheight = Number(xml.match(/\btileheight="(\d+)"/)?.[1] ?? 32);
    if (columns <= 0 || tilecount <= 0) return null;
    return { columns, tilecount, tilewidth, tileheight };
  } catch {
    return null;
  }
}

function isGridAreaAligned(
  tileWidth: number,
  tileHeight: number,
  margin: number,
  spacing: number,
  imageWidth: number,
  imageHeight: number,
): boolean {
  if (imageWidth <= 0 || imageHeight <= 0) return true;

  const usableWidth = imageWidth - 2 * margin;
  const usableHeight = imageHeight - 2 * margin;
  if (usableWidth <= 0 || usableHeight <= 0) return false;

  const widthMod = spacing > 0
    ? (usableWidth + spacing) % (tileWidth + spacing)
    : usableWidth % tileWidth;
  const heightMod = spacing > 0
    ? (usableHeight + spacing) % (tileHeight + spacing)
    : usableHeight % tileHeight;

  return widthMod === 0 && heightMod === 0;
}

function toSourceRelative(publicDir: string, imageAbsPath: string): string | null {
  const relative = path.relative(publicDir, imageAbsPath).replace(/\\/g, '/');
  if (!relative || relative.startsWith('..')) return null;
  return relative;
}

/**
 * Varre MAP_MUND_EXPORT_REGISTRY e retorna jobs grid-tileset para PNGs desalinhados.
 */
export function discoverMapGridTilesetJobs(publicDir: string): DiscoveredGridTilesetJob[] {
  const bySource = new Map<string, DiscoveredGridTilesetJob>();

  for (const entry of MAP_MUND_EXPORT_REGISTRY) {
    const exportPath = path.join(publicDir, 'assets', 'map_mund', entry.exportFileName);
    if (!existsSync(exportPath)) {
      console.warn(`[discoverMapTilesetJobs] Export ausente: ${entry.exportFileName}`);
      continue;
    }

    const mapDirectory = path.dirname(exportPath);
    const mapJson = JSON.parse(readFileSync(exportPath, 'utf8')) as {
      tilesets?: Array<Record<string, unknown>>;
    };

    for (const raw of mapJson.tilesets ?? []) {
      const source = typeof raw.source === 'string' ? raw.source : null;
      const image = typeof raw.image === 'string' ? raw.image : null;

      let imageAbs: string | null = null;
      let meta: TsxMetadata | null = null;

      if (source) {
        const tsxAbs = path.resolve(mapDirectory, source.replace(/\\/g, '/'));
        meta = parseTsxMetadata(tsxAbs);
        const imageMatch = existsSync(tsxAbs)
          ? readFileSync(tsxAbs, 'utf8').match(/<image[^>]*\ssource="([^"]+)"/)
          : null;
        if (imageMatch?.[1]) {
          imageAbs = path.resolve(path.dirname(tsxAbs), imageMatch[1].replace(/\\/g, '/'));
        }
      } else if (image) {
        imageAbs = path.resolve(mapDirectory, image.replace(/^\.\//, '').replace(/\\/g, '/'));
        const columns = Number(raw.columns ?? 0);
        const tilecount = Number(raw.tilecount ?? 0);
        const tilewidth = Number(raw.tilewidth ?? 32);
        const tileheight = Number(raw.tileheight ?? 32);
        if (columns > 0 && tilecount > 0) {
          meta = { columns, tilecount, tilewidth, tileheight };
        }
      }

      if (!imageAbs || !meta) continue;

      const tileWidth = meta.tilewidth;
      const tileHeight = meta.tileheight;
      if (tileWidth !== 32 || tileHeight !== 32) continue;

      const dimensions = readPngDimensions(imageAbs);
      if (!dimensions) continue;

      const margin = Number(raw.margin ?? 0);
      const spacing = Number(raw.spacing ?? 0);

      if (isGridAreaAligned(tileWidth, tileHeight, margin, spacing, dimensions.width, dimensions.height)) {
        continue;
      }

      const sourceRelative = toSourceRelative(publicDir, imageAbs);
      if (!sourceRelative) continue;

      const existing = bySource.get(sourceRelative);
      if (existing) {
        if (!existing.mapIds.includes(entry.mapId)) {
          bySource.set(sourceRelative, {
            ...existing,
            mapIds: [...existing.mapIds, entry.mapId],
          });
        }
        continue;
      }

      bySource.set(sourceRelative, {
        id: sanitizeJobId(sourceRelative),
        sourceRelative,
        tileWidth,
        tileHeight,
        columns: meta.columns,
        tilecount: meta.tilecount,
        mapIds: [entry.mapId],
      });
    }
  }

  return [...bySource.values()].sort((a, b) => a.sourceRelative.localeCompare(b.sourceRelative));
}
