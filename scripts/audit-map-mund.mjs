#!/usr/bin/env node
/**
 * Valida artefatos Phaser-ready em src/config/maps/*PhaserMap.json
 * e confirma que cada PNG de tileset existe em public/assets/.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapsDir = path.join(root, 'src', 'config', 'maps');
const publicDir = path.join(root, 'public');
const processedManifestPath = path.join(publicDir, 'assets', 'processed', 'manifest.json');

/** @type {Record<string, { imageUrl: string; alignedWidth?: number; alignedHeight?: number }>} */
let processedTilesetsBySource = {};

if (existsSync(processedManifestPath)) {
  try {
    const raw = JSON.parse(readFileSync(processedManifestPath, 'utf8'));
    processedTilesetsBySource = raw.tilesets ?? {};
  } catch (error) {
    console.warn('[audit:map-mund] manifest processado ilegível — rode npm run generate-assets', error);
  }
} else {
  console.warn('[audit:map-mund] manifest processado ausente — rode npm run generate-assets');
}

function resolveTiledPublicAssetUrl(mapJsonUrl, tiledImagePath) {
  const normalized = tiledImagePath.replace(/\\/g, '/');
  if (normalized.startsWith('/assets/')) {
    return processedTilesetsBySource[normalized]?.imageUrl ?? normalized;
  }

  const mapBase = mapJsonUrl.replace(/\/[^/]+$/, '');
  const combined = `${mapBase}/${normalized}`;
  const segments = combined.split('/').filter((segment) => segment.length > 0);
  const resolved = [];

  for (const segment of segments) {
    if (segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  const sourceUrl = `/${resolved.join('/')}`;
  return processedTilesetsBySource[sourceUrl]?.imageUrl ?? sourceUrl;
}

const MAP_ENTRIES = [
  {
    mapId: 'city_01',
    exportFileName: 'city_01_test.tmj',
    phaserBasename: 'city01PhaserMap.json',
    mirrorBasename: 'city01TiledMap.json',
  },
  {
    mapId: 'farm_zone_01',
    exportFileName: 'zona_beco_dos_fundos_tilemap.tmj',
    phaserBasename: 'farmZone01PhaserMap.json',
    mirrorBasename: 'farmZone01TiledMap.json',
  },
];

let failed = false;

for (const entry of MAP_ENTRIES) {
  const phaserPath = path.join(mapsDir, entry.phaserBasename);
  const mirrorPath = path.join(mapsDir, entry.mirrorBasename);
  const exportPath = path.join(publicDir, 'assets', 'map_mund', entry.exportFileName);

  if (!existsSync(exportPath)) {
    console.error(`[audit:map-mund] Export designer ausente: ${entry.exportFileName}`);
    failed = true;
    continue;
  }

  if (!existsSync(mirrorPath)) {
    console.error(`[audit:map-mund] Espelho ausente: ${entry.mirrorBasename} — rode npm run mirror:map-mund`);
    failed = true;
    continue;
  }

  if (!existsSync(phaserPath)) {
    console.error(`[audit:map-mund] Artefato Phaser ausente: ${entry.phaserBasename} — rode npm run mirror:map-mund`);
    failed = true;
    continue;
  }

  const phaserMap = JSON.parse(readFileSync(phaserPath, 'utf8'));
  const tilesets = Array.isArray(phaserMap.tilesets) ? phaserMap.tilesets : [];
  const mapJsonUrl = `/assets/map_mund/${entry.exportFileName}`;
  /** @type {Map<string, string[]>} */
  const tilesetsByImageUrl = new Map();

  if (tilesets.length === 0) {
    console.error(`[audit:map-mund] ${entry.mapId}: 0 tilesets no artefato Phaser`);
    failed = true;
    continue;
  }

  for (const tileset of tilesets) {
    if (tileset?.source) {
      console.error(`[audit:map-mund] ${entry.mapId}: tileset "${tileset.name}" ainda tem "source"`);
      failed = true;
    }

    if (typeof tileset?.image !== 'string' || tileset.image.length === 0) {
      console.error(`[audit:map-mund] ${entry.mapId}: tileset "${tileset?.name}" sem image`);
      failed = true;
      continue;
    }

    const tw = Number(tileset.tilewidth ?? 32);
    const th = Number(tileset.tileheight ?? 32);
    const margin = Number(tileset.margin ?? 0);
    const spacing = Number(tileset.spacing ?? 0);
    const iw = Number(tileset.imagewidth ?? 0);
    const ih = Number(tileset.imageheight ?? 0);
    if (iw > 0 && ih > 0) {
      const uw = iw - 2 * margin;
      const uh = ih - 2 * margin;
      const wOk = spacing > 0 ? (uw + spacing) % (tw + spacing) === 0 : uw % tw === 0;
      const hOk = spacing > 0 ? (uh + spacing) % (th + spacing) === 0 : uh % th === 0;
      if (!wOk || !hOk) {
        console.warn(
          `[audit:map-mund] ${entry.mapId}: tileset "${tileset.name}" grid desalinhado (${iw}×${ih}, margin=${margin}) — rode npm run generate-assets && mirror:map-mund.`,
        );
      }
    }

    const publicUrl = resolveTiledPublicAssetUrl(mapJsonUrl, tileset.image);
    const namesForUrl = tilesetsByImageUrl.get(publicUrl) ?? [];
    namesForUrl.push(tileset.name);
    tilesetsByImageUrl.set(publicUrl, namesForUrl);

    const diskPath = path.join(publicDir, publicUrl.replace(/^\//, '').replace(/\//g, path.sep));
    if (!existsSync(diskPath)) {
      console.error(`[audit:map-mund] ${entry.mapId}: PNG ausente para "${tileset.name}" → ${publicUrl}`);
      failed = true;
    }
  }

  for (const [publicUrl, names] of tilesetsByImageUrl) {
    if (names.length > 1) {
      console.warn(
        `[audit:map-mund] ${entry.mapId}: atlas compartilhado ${publicUrl} → tilesets [${names.join(', ')}] — preload usa chave única por URL.`,
      );
    }
  }

  const tileLayers = (phaserMap.layers ?? []).filter((layer) => layer?.type === 'tilelayer');
  const gridTilesets = tilesets.filter(
    (ts) => Number(ts.tilewidth) === 32 && Number(ts.tileheight) === 32,
  );

  console.log(
    `[audit:map-mund] ${entry.mapId}: OK — ${tilesets.length} tileset(s), ${gridTilesets.length} grid 32×32, ${tileLayers.length} tile layer(s)`,
  );
}

if (failed) {
  console.error('[audit:map-mund] FALHOU — corrija exports Tiled ou rode npm run mirror:map-mund');
  process.exit(1);
}

console.log('[audit:map-mund] OK — artefatos Phaser prontos para runtime.');
