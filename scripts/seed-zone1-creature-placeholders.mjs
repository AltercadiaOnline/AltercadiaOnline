/**
 * Gera PNGs placeholder side-view (48×40) para criaturas da Zona 1.
 * Saída: public/assets/creatures/zone1/<pasta>/{idle,attack}.png
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicZoneDir = path.join(root, 'public', 'assets', 'creatures', 'zone1');

const CREATURES = [
  { folder: 'corvo', body: [30, 30, 40], accent: [120, 80, 200], leanAttack: 6 },
  { folder: 'rato', body: [140, 110, 90], accent: [200, 160, 120], leanAttack: 4 },
  { folder: 'cao_selvagem', body: [160, 100, 60], accent: [220, 180, 140], leanAttack: 8 },
  { folder: 'morcego', body: [50, 40, 90], accent: [180, 120, 220], leanAttack: 10 },
  { folder: 'aranha', body: [40, 20, 20], accent: [220, 60, 60], leanAttack: 5 },
];

const WIDTH = 48;
const HEIGHT = 40;

function crc32(buffer) {
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[i] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function drawCreaturePixels(bodyRgb, accentRgb, leanAttack) {
  const rgba = Buffer.alloc(WIDTH * HEIGHT * 4, 0);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };

  const cx = 24;
  const cy = 22;
  for (let y = 8; y < 34; y += 1) {
    for (let x = 10; x < 38; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const inBody = (dx * dx) / 180 + (dy * dy) / 220 <= 1;
      if (inBody) set(x, y, ...bodyRgb);
    }
  }

  for (let y = 12; y < 22; y += 1) {
    for (let x = 30; x < 42; x += 1) {
      set(x, y, ...accentRgb);
    }
  }

  set(36, 16, 255, 255, 255);
  set(37, 16, 20, 20, 30);

  for (let y = 28; y < 38; y += 1) {
    set(18, y, bodyRgb[0] - 20, bodyRgb[1] - 20, bodyRgb[2] - 20);
    set(30, y, bodyRgb[0] - 20, bodyRgb[1] - 20, bodyRgb[2] - 20);
  }

  if (leanAttack > 0) {
    for (let y = 10; y < 28; y += 1) {
      for (let x = 32; x < 46; x += 1) {
        set(x - leanAttack, y, ...accentRgb);
      }
    }
  }

  return rgba;
}

function encodePng(rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowStart = y * (WIDTH * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const creature of CREATURES) {
  const outDir = path.join(publicZoneDir, creature.folder);
  mkdirSync(outDir, { recursive: true });

  const idle = encodePng(drawCreaturePixels(creature.body, creature.accent, 0));
  const attack = encodePng(drawCreaturePixels(creature.body, creature.accent, creature.leanAttack));

  writeFileSync(path.join(outDir, 'idle.png'), idle);
  writeFileSync(path.join(outDir, 'attack.png'), attack);

  const hash = createHash('md5').update(idle).digest('hex').slice(0, 8);
  console.log(`[seed] ${creature.folder}: idle.png attack.png (${hash})`);
}

console.log(`[seed] Placeholders Zona 1 em ${publicZoneDir}`);
