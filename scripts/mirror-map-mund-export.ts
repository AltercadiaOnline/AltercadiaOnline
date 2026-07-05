/**
 * Espelha exports Tiled de public/assets/map_mund/ → src/config/maps/
 *
 * Saídas por mapa:
 * - *TiledMap.json — espelho com image/name resolvidos (preload + diff)
 * - *PhaserMap.json — artefato Phaser-ready (sem `source`, GIDs não-grid removidos)
 *
 * Rodado automaticamente em `npm run build` via prebuild:maps.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAP_MUND_EXPORT_REGISTRY,
  MAP_MUND_PUBLIC_BASE,
} from '../src/config/mapMundManifest.js';
import { buildPhaserTiledMapData, type TiledMapJson } from '../src/config/tiledMapJson.js';
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

function writeJsonFile(targetPath: string, data: unknown): void {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`[mirror:map-mund] Escrito: ${path.relative(root, targetPath)}`);
}

function assertPhaserArtifact(
  mapId: string,
  phaserBasename: string,
  phaserData: Record<string, unknown>,
): void {
  const tilesets = Array.isArray(phaserData.tilesets) ? phaserData.tilesets : [];
  if (tilesets.length === 0) {
    console.error(`[mirror:map-mund] ${mapId}: artefato Phaser sem tilesets — verifique .tsx e imagens.`);
    process.exit(1);
  }

  for (const tileset of tilesets) {
    if (tileset && typeof tileset === 'object' && 'source' in tileset) {
      console.error(
        `[mirror:map-mund] ${mapId}: tileset "${String((tileset as { name?: string }).name)}" ainda tem "source" — buildPhaserTiledMapData falhou.`,
      );
      process.exit(1);
    }
    const image = (tileset as { image?: string }).image;
    if (typeof image !== 'string' || image.length === 0) {
      console.error(
        `[mirror:map-mund] ${mapId}: tileset "${String((tileset as { name?: string }).name)}" sem image.`,
      );
      process.exit(1);
    }
  }

  const layers = Array.isArray(phaserData.layers) ? phaserData.layers : [];
  const tileLayers = layers.filter((layer) => layer && (layer as { type?: string }).type === 'tilelayer');
  if (tileLayers.length === 0) {
    console.warn(`[mirror:map-mund] ${mapId}: nenhuma tile layer no artefato Phaser.`);
  }

  console.log(
    `[mirror:map-mund] ${mapId} → ${phaserBasename}: ${tilesets.length} tileset(s), ${tileLayers.length} tile layer(s)`,
  );
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

  writeJsonFile(path.join(mirrorDir, entry.mirrorBasename), map);

  const phaserData = buildPhaserTiledMapData(map as TiledMapJson) as Record<string, unknown>;
  writeJsonFile(path.join(mirrorDir, entry.phaserBasename), phaserData);
  assertPhaserArtifact(entry.mapId, entry.phaserBasename, phaserData);

  const runtimeUrl = `${MAP_MUND_PUBLIC_BASE}/${entry.exportFileName}`;
  console.log(
    `[mirror:map-mund] ${entry.mapId} — designer: ${runtimeUrl} (somente referência; Phaser usa ${entry.phaserBasename})`,
  );
}

console.log('[mirror:map-mund] OK — fonte designer: public/assets/map_mund/');
