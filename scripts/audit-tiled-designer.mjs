#!/usr/bin/env node
/**
 * Diagnóstico do export Tiled para o designer — o que está certo/errado antes do Phaser.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmjPath = path.join(root, 'public', 'assets', 'map_mund', 'city_01_test.tmj');
const tmj = JSON.parse(readFileSync(tmjPath, 'utf8'));
const mapDir = path.dirname(tmjPath);

const MAP_TILE = 32;
const mapW = tmj.width;
const mapH = tmj.height;
const tw = tmj.tilewidth;
const th = tmj.tileheight;

console.log('=== MAPA city_01_test.tmj ===');
console.log(`Tamanho: ${mapW}×${mapH} tiles (${mapW * tw}×${mapH * th} px)`);
console.log(`Tile do mapa: ${tw}×${th} (esperado: ${MAP_TILE}×${MAP_TILE})`);

if (tw !== MAP_TILE || th !== MAP_TILE) {
  console.log('❌ Map → Propriedades do mapa: tile width/height deve ser 32');
} else if (mapW !== 40 || mapH !== 40) {
  console.log(`⚠ Mapa ${mapW}×${mapH} — projeto usa base 40×40 (1280×1280 px)`);
} else {
  console.log('✓ Tamanho e grid do mapa OK');
}

const layers = tmj.layers ?? [];
console.log('\n=== CAMADAS ===');
for (const layer of layers) {
  if (layer.type === 'tilelayer') {
    const filled = (layer.data ?? []).filter((g) => (g & 0x1fffffff) > 0).length;
    console.log(`  tile  "${layer.name}" — ${filled} células preenchidas`);
  } else if (layer.type === 'objectgroup') {
    console.log(`  obj   "${layer.name}" — ${(layer.objects ?? []).length} objetos`);
  }
}

function loadTilesetMeta(ref) {
  if (ref.image) {
    return {
      name: ref.name,
      tilewidth: ref.tilewidth ?? MAP_TILE,
      tileheight: ref.tileheight ?? MAP_TILE,
      imagewidth: ref.imagewidth ?? 0,
      imageheight: ref.imageheight ?? 0,
      columns: ref.columns ?? 0,
      tilecount: ref.tilecount ?? 0,
    };
  }

  if (!ref.source) return null;

  const tsxPath = path.normalize(path.join(mapDir, ref.source));
  if (!existsSync(tsxPath)) {
    return { name: ref.name ?? ref.source, missing: true };
  }

  const xml = readFileSync(tsxPath, 'utf8');
  const num = (pattern) => {
    const match = xml.match(pattern);
    return match ? Number(match[1]) : 0;
  };

  return {
    name: ref.name ?? path.basename(ref.source, '.tsx'),
    tilewidth: num(/tilewidth="(\d+)"/),
    tileheight: num(/tileheight="(\d+)"/),
    imagewidth: num(/width="(\d+)"/),
    imageheight: num(/height="(\d+)"/),
    columns: num(/columns="(\d+)"/),
    tilecount: num(/tilecount="(\d+)"/),
    source: ref.source,
  };
}

const tilesetRefs = [...(tmj.tilesets ?? [])].sort((a, b) => a.firstgid - b.firstgid);
const tilesets = tilesetRefs.map((ref) => ({ ...loadTilesetMeta(ref), firstgid: ref.firstgid }));

function findTileset(gid) {
  let hit = tilesets[0];
  for (const ts of tilesets) {
    if (gid >= ts.firstgid) hit = ts;
  }
  return hit;
}

console.log('\n=== TILESETS ===');
const nonGrid = [];
const craftpix = [];
for (const ts of tilesets) {
  if (ts.missing) {
    console.log(`  ❌ ${ts.name} — arquivo .tsx ausente`);
    continue;
  }
  const isGrid = ts.tilewidth === MAP_TILE && ts.tileheight === MAP_TILE;
  const craftPixWidth = ts.imagewidth === 240;
  let status = isGrid ? 'grid 32×32' : `NÃO-GRID ${ts.tilewidth}×${ts.tileheight}`;
  if (craftPixWidth) {
    status += ' | CraftPix 240px';
    craftpix.push(ts.name);
  }
  if (!isGrid) nonGrid.push(ts);
  console.log(`  ${isGrid ? '✓' : '❌'} ${ts.name} (${status})`);
}

const propInTileLayers = new Map();
for (const layer of layers.filter((l) => l.type === 'tilelayer')) {
  for (const raw of layer.data ?? []) {
    const gid = raw & 0x1fffffff;
    if (gid <= 0) continue;
    const ts = findTileset(gid);
    if (ts.tilewidth !== MAP_TILE || ts.tileheight !== MAP_TILE) {
      propInTileLayers.set(ts.name, (propInTileLayers.get(ts.name) ?? 0) + 1);
    }
  }
}

console.log('\n=== REGRAS PHASER (o que quebra render) ===');
if (propInTileLayers.size > 0) {
  console.log('❌ Tilesets de PROP (48×48, 64×64, 128×128…) pintados em TILE LAYER:');
  for (const [name, count] of propInTileLayers) {
    console.log(`     • ${name}: ${count} células — mover para OBJECT LAYER`);
  }
} else {
  console.log('✓ Nenhum prop grande em tile layer');
}

if (craftpix.length > 0) {
  console.log('⚠ Tilesets CraftPix (PNG 240px de largura):');
  for (const name of craftpix) {
    console.log(`     • ${name} — funciona, mas Phaser avisa no console; ideal: recortar PNG para 224px ou usar tileset LPC 32×32`);
  }
}

console.log('\n=== WORKFLOW CORRETO NO TILED ===');
console.log('1. Mapa: 40×40 tiles, 32×32 px');
console.log('2. CHÃO (estrada, grama): tile layer + tilesets em /terrain/ com tiles 32×32');
console.log('3. POSTES, BANCOS, CASAS: object layer (não pintar com tile brush em tile layer)');
console.log('4. Exportar: File → Export As → city_01_test.tmj em public/assets/map_mund/');
console.log('5. Build: npm run mirror:map-mund (gera *PhaserMap.json — Phaser NÃO lê .tmj cru)');
console.log('6. NPCs: object layer "npcs", pontos com name = id do NPC_REGISTRY (opcional)');

const spawnLayer = layers.find(
  (l) => l.type === 'objectgroup' && /^(spawns?)$/i.test(l.name.trim()),
);
if (spawnLayer?.objects?.some((o) => /player_spawn/i.test(o.name ?? ''))) {
  console.log('\n✓ Spawn player_spawn presente');
} else {
  console.log('\n⚠ Camada spawns sem player_spawn — jogo usa centro do mapa');
}

const npcLayer = layers.find(
  (l) => l.type === 'objectgroup' && l.name.trim().toLowerCase() === 'npcs',
);
console.log(`\nNPC layer: ${npcLayer ? `${npcLayer.objects?.length ?? 0} pontos` : 'ausente (OK — posição legada)'}`);
