/**
 * Recria os tiles de chão 40×40 do jogo a partir do pacote Craftpix em
 * public/assets/terrain. Os tilesets de estrada são grids 16×16; extraímos a
 * célula de preenchimento sólido (cobblestone) para rua/praça e sintetizamos a
 * grama a partir da paleta verde do pacote (não há tile de campo sólido nele).
 *
 * Uso: npm run build:ground-tiles
 *
 * Mantém o contrato de src/assets/terrain/groundTileManifest.ts:
 *   ground_grass.png · ground_plaza.png · ground_road.png — 40×40.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cropRegion,
  decodePng,
  encodePng,
  getPixel,
  nearestResize,
  setPixel,
  type RgbaImage,
} from './lib/pngCodec.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK_DIR = path.join(root, 'public', 'assets', 'terrain', 'tile.map.2.test', 'PNG_Tiled');
const GROUND_GRASS_PACK = path.join(PACK_DIR, 'Ground_grass.png');
const OUT_DIR = path.join(root, 'public', 'assets', 'terrain', 'tiles');

const CELL = 16;
const TILE = 40;

function load(file: string): RgbaImage {
  return decodePng(readFileSync(file));
}

/** Diferença média de cor entre o anel de borda e o centro de uma célula. */
function edgeContrast(cell: RgbaImage): number {
  const center = getPixel(cell, Math.floor(cell.width / 2), Math.floor(cell.height / 2));
  let total = 0;
  let count = 0;
  for (let i = 0; i < cell.width; i += 1) {
    for (const [x, y] of [
      [i, 0],
      [i, cell.height - 1],
      [0, i],
      [cell.width - 1, i],
    ] as const) {
      const p = getPixel(cell, x, y);
      total += Math.abs(p[0] - center[0]) + Math.abs(p[1] - center[1]) + Math.abs(p[2] - center[2]);
      count += 1;
    }
  }
  return total / Math.max(1, count);
}

function opaqueRatio(cell: RgbaImage): number {
  let opaque = 0;
  for (let i = 3; i < cell.rgba.length; i += 4) {
    if (cell.rgba[i] === 255) opaque += 1;
  }
  return opaque / (cell.width * cell.height);
}

/**
 * Varre o tileset por células 16×16 e devolve a de preenchimento mais limpo:
 * 100% opaca, com menor contraste de borda (sem realce/contorno) e mais central.
 */
function pickSolidFillCell(sheet: RgbaImage): RgbaImage {
  const cols = Math.floor(sheet.width / CELL);
  const rows = Math.floor(sheet.height / CELL);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  let best: { cell: RgbaImage; score: number } | null = null;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = cropRegion(sheet, c * CELL, r * CELL, CELL, CELL);
      if (opaqueRatio(cell) < 1) continue;
      const centrality = Math.hypot(c - cx, r - cy);
      const score = edgeContrast(cell) + centrality * 0.5;
      if (!best || score < best.score) best = { cell, score };
    }
  }

  if (!best) throw new Error('[build:ground] Nenhuma célula de preenchimento sólida encontrada.');
  return best.cell;
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** Amostra a paleta verde dominante de Ground_grass.png. */
function sampleGreenBase(sheet: RgbaImage): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < sheet.rgba.length; i += 4) {
    const cr = sheet.rgba[i]!;
    const cg = sheet.rgba[i + 1]!;
    const cb = sheet.rgba[i + 2]!;
    const ca = sheet.rgba[i + 3]!;
    if (ca < 200) continue;
    if (cg > cr + 8 && cg > cb + 8) {
      r += cr;
      g += cg;
      b += cb;
      count += 1;
    }
  }
  if (count === 0) return [86, 132, 70];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/** Gera grama 40×40 tileável a partir do verde base, com ruído determinístico. */
function synthesizeGrass(base: [number, number, number]): RgbaImage {
  const out: RgbaImage = { width: TILE, height: TILE, rgba: Buffer.alloc(TILE * TILE * 4) };
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const shades: Array<[number, number, number]> = [
    [clamp8(base[0] * 0.78), clamp8(base[1] * 0.78), clamp8(base[2] * 0.78)],
    [base[0], base[1], base[2]],
    [clamp8(base[0] * 1.12), clamp8(base[1] * 1.12), clamp8(base[2] * 1.1)],
    [clamp8(base[0] * 1.28), clamp8(base[1] * 1.26), clamp8(base[2] * 1.2)],
  ];
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const n = rand();
      let shade = shades[1]!;
      if (n < 0.18) shade = shades[0]!;
      else if (n < 0.62) shade = shades[1]!;
      else if (n < 0.9) shade = shades[2]!;
      else shade = shades[3]!;
      setPixel(out, x, y, [shade[0], shade[1], shade[2], 255]);
    }
  }
  for (let i = 0; i < 26; i += 1) {
    const bx = Math.floor(rand() * TILE);
    const by = Math.floor(rand() * (TILE - 3));
    const blade = shades[3]!;
    for (let h = 0; h < 3; h += 1) {
      setPixel(out, bx, by + h, [blade[0], blade[1], blade[2], 255]);
    }
  }
  return out;
}

function tintCobble(cell: RgbaImage, factor: number): RgbaImage {
  const out = cropRegion(cell, 0, 0, cell.width, cell.height);
  for (let i = 0; i < out.rgba.length; i += 4) {
    out.rgba[i] = clamp8(out.rgba[i]! * factor);
    out.rgba[i + 1] = clamp8(out.rgba[i + 1]! * factor);
    out.rgba[i + 2] = clamp8(out.rgba[i + 2]! * factor);
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });

const road1 = load(path.join(PACK_DIR, 'Road1.png'));
const road3 = load(path.join(PACK_DIR, 'Road3.png'));

const roadFill = pickSolidFillCell(road1);
const plazaFill = tintCobble(pickSolidFillCell(road3), 1.18);
const grass = synthesizeGrass(sampleGreenBase(load(GROUND_GRASS_PACK)));

const outputs: Array<{ file: string; image: RgbaImage }> = [
  { file: 'ground_road.png', image: nearestResize(roadFill, TILE, TILE) },
  { file: 'ground_plaza.png', image: nearestResize(plazaFill, TILE, TILE) },
  { file: 'ground_grass.png', image: grass },
];

for (const { file, image } of outputs) {
  const target = path.join(OUT_DIR, file);
  writeFileSync(target, encodePng(image));
  console.log(`[build:ground] ${file} → ${image.width}×${image.height}`);
}

console.log('[build:ground] OK — tiles de chão recriados a partir do pacote Craftpix.');
