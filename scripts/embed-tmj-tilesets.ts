/**
 * Incorpora tilesets externos (.tsx) diretamente no .tmj — mesma estrutura do export
 * "Embed tilesets" do Tiled, sem deduplicar por nome (preserva firstgid).
 *
 * Uso: npx tsx scripts/embed-tmj-tilesets.ts city_01_test.tmj
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyImageMetrics,
  resolveExternalTilesetImage,
} from './lib/resolveTiledExternalTilesets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapMundDir = path.join(root, 'public', 'assets', 'map_mund');

type TilesetEntry = Record<string, unknown> & {
  firstgid?: number;
  name?: string;
  image?: string;
  source?: string;
  tilewidth?: number;
  tileheight?: number;
  margin?: number;
  spacing?: number;
};

type TiledMapExport = {
  tilesets?: TilesetEntry[];
  [key: string]: unknown;
};

function embedTilesetEntry(mapDirectory: string, tileset: TilesetEntry): TilesetEntry {
  if (typeof tileset.image === 'string' && tileset.image.length > 0) {
    const imageAbs = path.resolve(mapDirectory, tileset.image.replace(/^\.\//, ''));
    if (existsSync(imageAbs)) {
      return applyImageMetrics(tileset, imageAbs) as TilesetEntry;
    }
    return tileset;
  }

  if (typeof tileset.source !== 'string' || tileset.source.length === 0) {
    return tileset;
  }

  const resolved = resolveExternalTilesetImage(mapDirectory, tileset.source);
  if (!resolved) {
    console.warn(
      `[embed-tmj] TSX não resolvido (firstgid=${tileset.firstgid}): ${tileset.source}`,
    );
    return tileset;
  }

  const imageAbs = path.resolve(mapDirectory, resolved.imagePath.replace(/^\.\//, ''));
  const { source: _removed, ...rest } = tileset;

  return applyImageMetrics(
    {
      ...rest,
      name: resolved.name,
      image: resolved.imagePath,
      tilewidth: tileset.tilewidth ?? resolved.tilewidth,
      tileheight: tileset.tileheight ?? resolved.tileheight,
      margin: tileset.margin ?? 0,
      spacing: tileset.spacing ?? 0,
    },
    imageAbs,
  ) as TilesetEntry;
}

function embedMapTilesets(exportFileName: string): void {
  const exportPath = path.join(mapMundDir, exportFileName);
  if (!existsSync(exportPath)) {
    console.error('[embed-tmj] Arquivo ausente:', exportPath);
    process.exit(1);
  }

  const map = JSON.parse(readFileSync(exportPath, 'utf8')) as TiledMapExport;
  const before = (map.tilesets ?? []).filter((entry) => typeof entry.source === 'string').length;

  map.tilesets = (map.tilesets ?? []).map((tileset) => embedTilesetEntry(mapMundDir, tileset));

  const after = (map.tilesets ?? []).filter((entry) => typeof entry.source === 'string').length;
  const embedded = before - after;

  writeFileSync(exportPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');

  console.log(
    `[embed-tmj] ${exportFileName}: ${embedded} tileset(s) incorporado(s); ${after} ainda com "source".`,
  );

  if (after > 0) {
    console.error('[embed-tmj] Re-exporte no Tiled com Embed tilesets ou corrija os .tsx ausentes.');
    process.exit(1);
  }
}

const target = process.argv[2];
if (!target) {
  console.error('Uso: npx tsx scripts/embed-tmj-tilesets.ts <arquivo.tmj>');
  process.exit(1);
}

embedMapTilesets(target);
