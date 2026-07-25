/**
 * Gera overviews WebP do minimapa a partir da silhueta procedural
 * (mesma paleta que buildMinimapTerrain — fallback no cliente).
 *
 * Uso: node ./scripts/generate-minimap-overviews.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'minimaps');

const CITY_TILES = 40;
const FARM_TILES_W = Math.ceil(860 / 32);
const FARM_TILES_H = Math.ceil(2400 / 32);
/** Escala por tile no asset final (CSS escala depois). */
const PX_PER_TILE = 8;

const CITY_PALETTE = {
  ground: '#1e2228',
  road: '#3a3f48',
  plaza: '#4a4550',
  residential: '#2a3540',
  commerce: '#35302a',
  arena: '#2e3a32',
  structure: '#4a3a2e',
};

const FARM_PALETTE = {
  alley: '#2a2e36',
  wall: '#5c3830',
  neon: '#1a2830',
  stripe: '#323840',
};

function parseHex(hex) {
  const n = hex.replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function fillRect(buf, w, x0, y0, bw, bh, color) {
  const { r, g, b } = parseHex(color);
  for (let y = y0; y < y0 + bh; y += 1) {
    for (let x = x0; x < x0 + bw; x += 1) {
      if (x < 0 || y < 0 || x >= w) continue;
      const i = (y * w + x) * 3;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
    }
  }
}

function paintTileGrid(colors, tilesW, tilesH) {
  const w = tilesW * PX_PER_TILE;
  const h = tilesH * PX_PER_TILE;
  const buf = Buffer.alloc(w * h * 3);
  for (let ty = 0; ty < tilesH; ty += 1) {
    for (let tx = 0; tx < tilesW; tx += 1) {
      const hex = colors[ty]?.[tx] ?? '#222';
      fillRect(buf, w, tx * PX_PER_TILE, ty * PX_PER_TILE, PX_PER_TILE, PX_PER_TILE, hex);
    }
  }
  return { buf, w, h };
}

// --- City layout mirrors city01LayoutConstants (keep in sync) ---
const HALF = 20;
const ROAD_X_MIN = HALF - 5;
const ROAD_X_MAX = HALF - 1;
const ROAD_Y_MIN = HALF - 3;
const ROAD_Y_MAX = HALF + 1;
const PLAZA_MIN = HALF - 5;
const PLAZA_MAX = HALF + 5;
const ROAD_SOUTH_Y = 38;
const ROAD_NORTH_Y = 1;
const RES = { tileX: 2, tileY: 3, tileW: 13, tileH: 14 };
const COM = { tileX: 21, tileY: 8, tileW: 16, tileH: 22 };
const RES_SPINE = { tileX: 8, tileY: 8, tileW: 5, tileH: 5 };
const COM_SPINE = { tileX: 20, tileY: 17, tileW: 6, tileH: 4 };
const ARENA = { tileX: 17, tileY: 17, tileW: 6, tileH: 6 };
const STRUCTURES = [
  { tileX: 4, tileY: 9, tileW: 4, tileH: 3 },
  { tileX: 9, tileY: 9, tileW: 4, tileH: 3 },
  { tileX: 4, tileY: 4, tileW: 5, tileH: 4 },
  { tileX: 22, tileY: 11, tileW: 5, tileH: 4 },
  { tileX: 28, tileY: 11, tileW: 7, tileH: 5 },
  { tileX: 22, tileY: 24, tileW: 4, tileH: 3 },
  { tileX: 27, tileY: 24, tileW: 4, tileH: 3 },
  { tileX: 32, tileY: 24, tileW: 4, tileH: 3 },
  { tileX: 30, tileY: 2, tileW: 7, tileH: 4 },
];

function inRect(r, x, y) {
  return x >= r.tileX && x < r.tileX + r.tileW && y >= r.tileY && y < r.tileY + r.tileH;
}

function isRoad(x, y) {
  const main = x >= ROAD_X_MIN && x <= ROAD_X_MAX && y >= ROAD_NORTH_Y && y <= ROAD_SOUTH_Y;
  const ew =
    y >= ROAD_Y_MIN
    && y <= ROAD_Y_MAX
    && x >= RES.tileX
    && x <= COM.tileX + COM.tileW - 1;
  return main || ew || inRect(RES_SPINE, x, y) || inRect(COM_SPINE, x, y);
}

function cityColor(x, y) {
  if (inRect(ARENA, x, y)) return CITY_PALETTE.arena;
  if (x >= PLAZA_MIN && x <= PLAZA_MAX && y >= PLAZA_MIN && y <= PLAZA_MAX) {
    return CITY_PALETTE.plaza;
  }
  if (isRoad(x, y)) return CITY_PALETTE.road;
  for (const s of STRUCTURES) {
    if (inRect(s, x, y)) return CITY_PALETTE.structure;
  }
  if (inRect(RES, x, y)) return CITY_PALETTE.residential;
  if (inRect(COM, x, y)) return CITY_PALETTE.commerce;
  return CITY_PALETTE.ground;
}

function buildCityColors() {
  const colors = [];
  for (let y = 0; y < CITY_TILES; y += 1) {
    const row = [];
    for (let x = 0; x < CITY_TILES; x += 1) row.push(cityColor(x, y));
    colors.push(row);
  }
  return colors;
}

function buildFarmColors() {
  const alleyMin = Math.floor(FARM_TILES_W / 2) - 2;
  const alleyMax = Math.floor(FARM_TILES_W / 2) + 1;
  const colors = [];
  for (let y = 0; y < FARM_TILES_H; y += 1) {
    const row = [];
    for (let x = 0; x < FARM_TILES_W; x += 1) {
      if (x < alleyMin || x > alleyMax) {
        row.push(FARM_PALETTE.wall);
      } else if (x % 7 === 0) {
        row.push(FARM_PALETTE.neon);
      } else if ((x + y) % 11 === 0) {
        row.push(FARM_PALETTE.stripe);
      } else {
        row.push(FARM_PALETTE.alley);
      }
    }
    colors.push(row);
  }
  return colors;
}

async function writeOverview(name, colors, tilesW, tilesH) {
  const { buf, w, h } = paintTileGrid(colors, tilesW, tilesH);
  const outPath = path.join(OUT_DIR, `${name}.webp`);
  await sharp(buf, { raw: { width: w, height: h, channels: 3 } })
    .webp({ quality: 82, effort: 4 })
    .toFile(outPath);
  console.log(`[minimap] wrote ${outPath} (${w}×${h})`);
}

await mkdir(OUT_DIR, { recursive: true });
await writeOverview('city_01', buildCityColors(), CITY_TILES, CITY_TILES);
await writeOverview('farm_zone_01', buildFarmColors(), FARM_TILES_W, FARM_TILES_H);

// Marker file so the folder is intentional
await writeFile(
  path.join(OUT_DIR, 'README.md'),
  [
    '# Minimapa — overviews estáticos',
    '',
    'Gerados por `node ./scripts/generate-minimap-overviews.mjs`.',
    'Silhueta alinhada aos layouts Construct (`cidade_01` / `zonabeco1`).',
    'O runtime desenha markers/viewport por cima via `MinimapRenderer`.',
    '',
  ].join('\n'),
);

console.log('[minimap] OK');
