/**
 * Espelha exports Tiled de public/assets/map_mund/ → src/config/maps/*.json
 * para metadados de preload (tilesets + object images). Não altera os .tmj do designer.
 *
 * Uso: npm run mirror:map-mund
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAP_MUND_EXPORT_REGISTRY,
  MAP_MUND_PUBLIC_BASE,
} from '../src/config/mapMundManifest.js';
import { enrichTilesetsForPreload } from './lib/resolveTiledExternalTilesets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapMundDir = path.join(root, 'public', 'assets', 'map_mund');
const mirrorDir = path.join(root, 'src', 'config', 'maps');
const TILE = 32;

type TiledMapExport = {
  tilewidth?: number;
  tileheight?: number;
  tilesets?: Array<Record<string, unknown>>;
  layers?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

function loadMapExport(exportFileName: string): TiledMapExport {
  const exportPath = path.join(mapMundDir, exportFileName);
  return JSON.parse(readFileSync(exportPath, 'utf8')) as TiledMapExport;
}

function validateTileSize(map: TiledMapExport, exportFileName: string): void {
  const tileWidth = Number(map.tilewidth);
  const tileHeight = Number(map.tileheight);

  if (tileWidth !== TILE || tileHeight !== TILE) {
    console.warn(
      `[mirror:map-mund] ${exportFileName}: tilewidth/tileheight = ${tileWidth}×${tileHeight} (esperado ${TILE}×${TILE})`,
    );
  }
}

function writeMirror(map: TiledMapExport, mirrorBasename: string): void {
  const mirrorPath = path.join(mirrorDir, mirrorBasename);
  mkdirSync(mirrorDir, { recursive: true });
  writeFileSync(mirrorPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  console.log(`[mirror:map-mund] Espelho: ${path.relative(root, mirrorPath)}`);
}

for (const entry of MAP_MUND_EXPORT_REGISTRY) {
  const exportPath = path.join(mapMundDir, entry.exportFileName);
  if (!existsSync(exportPath)) {
    console.error('[mirror:map-mund] Export ausente:', exportPath);
    process.exit(1);
  }

  const map = loadMapExport(entry.exportFileName);
  validateTileSize(map, entry.exportFileName);

  map.tilesets = enrichTilesetsForPreload(mapMundDir, map.tilesets as never);
  map.tilewidth = TILE;
  map.tileheight = TILE;

  writeMirror(map, entry.mirrorBasename);

  const runtimeUrl = `${MAP_MUND_PUBLIC_BASE}/${entry.exportFileName}`;
  console.log(
    `[mirror:map-mund] ${entry.mapId} → runtime ${runtimeUrl} (${map.tilesets?.length ?? 0} tilesets)`,
  );
}

console.log('[mirror:map-mund] OK — fonte canônica: public/assets/map_mund/');
