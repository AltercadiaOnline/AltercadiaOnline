/**
 * Tiles de chão 40×40 — grass, plaza, road (tileáveis).
 * Saída: public/assets/terrain/tiles/
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'terrain', 'tiles');
const SIZE = 40;

const P = {
  grass: [52, 78, 48],
  grassDark: [38, 58, 36],
  grassLight: [68, 98, 62],
  plaza: [118, 112, 104],
  plazaDark: [92, 86, 80],
  plazaLight: [142, 136, 126],
  road: [46, 50, 56],
  roadDark: [34, 38, 42],
  roadMark: [90, 94, 100],
  crack: [28, 30, 34],
  outline: [30, 32, 36],
};

function crc32(buffer) {
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function createCanvas(width, height) {
  const rgba = Buffer.alloc(width * height * 4, 0);
  const set = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    rgba[i] = rgb[0]; rgba[i + 1] = rgb[1]; rgba[i + 2] = rgb[2]; rgba[i + 3] = 255;
  };
  return { width, height, rgba, set };
}

function encodePng(canvas) {
  const { width, height, rgba } = canvas;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function drawGrass() {
  const c = createCanvas(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const n = ((x * 17 + y * 31) % 7);
      const rgb = n < 2 ? P.grassDark : n < 5 ? P.grass : P.grassLight;
      c.set(x, y, rgb);
    }
  }
  // Capim urbano irregular nas bordas
  for (let x = 0; x < SIZE; x += 4) c.set(x, SIZE - 1, P.grassDark);
  c.set(3, 12, P.grassLight); c.set(22, 28, P.grassDark); c.set(35, 8, P.grassLight);
  return c;
}

function drawPlaza() {
  const c = createCanvas(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const tileX = Math.floor(x / 10);
      const tileY = Math.floor(y / 10);
      const mortar = (x % 10 === 0) || (y % 10 === 0);
      const checker = (tileX + tileY) % 2;
      if (mortar) c.set(x, y, P.plazaDark);
      else c.set(x, y, checker ? P.plaza : P.plazaLight);
    }
  }
  // Rachadura sutil
  c.set(18, 20, P.crack); c.set(19, 21, P.crack); c.set(20, 22, P.crack);
  return c;
}

function drawRoad() {
  const c = createCanvas(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const noise = (x * 13 + y * 7) % 5;
      c.set(x, y, noise === 0 ? P.roadDark : P.road);
    }
  }
  // Faixa central tracejada (tileável vertical)
  for (let y = 2; y < SIZE; y += 8) {
    for (let dy = 0; dy < 4; dy += 1) {
      c.set(19, y + dy, P.roadMark);
      c.set(20, y + dy, P.roadMark);
    }
  }
  // Borda inferior meio-fio
  for (let x = 0; x < SIZE; x += 1) {
    c.set(x, SIZE - 1, P.outline);
    c.set(x, SIZE - 2, P.plazaDark);
  }
  return c;
}

mkdirSync(outDir, { recursive: true });

for (const [id, draw] of [
  ['ground_grass', drawGrass],
  ['ground_plaza', drawPlaza],
  ['ground_road', drawRoad],
]) {
  const canvas = draw();
  const png = encodePng(canvas);
  writeFileSync(path.join(outDir, `${id}.png`), png);
  const hash = createHash('md5').update(png).digest('hex').slice(0, 8);
  console.log(`[seed] ${id}: 40x40 (${hash})`);
}

console.log(`[seed] Tiles de chão em ${outDir}`);
