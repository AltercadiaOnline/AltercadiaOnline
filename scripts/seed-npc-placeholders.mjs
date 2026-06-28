/**
 * Gera PNGs 32×32 para NPCs declarados em npcDefinition.ts.
 * Saída: public/assets/npcs/*.png
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'npcs');

const NPC_SPECS = [
  { file: 'npc_anciao.png', body: [107, 90, 160], accent: [255, 215, 0], label: 'C' },
  { file: 'npc_treinador.png', body: [60, 120, 180], accent: [255, 140, 60], label: 'Z' },
];

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
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function setPixel(rgba, width, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (y * width + x) * 4;
  rgba[i] = color[0];
  rgba[i + 1] = color[1];
  rgba[i + 2] = color[2];
  rgba[i + 3] = alpha;
}

const TILE = 32;

function drawNpcPlaceholder(spec) {
  const size = TILE;
  const rgba = Buffer.alloc(size * size * 4, 0);
  const outline = [30, 32, 36];

  for (let y = 6; y < 30; y += 1) {
    for (let x = 10; x < 22; x += 1) {
      setPixel(rgba, size, x, y, spec.body);
    }
  }
  for (let y = 3; y < 11; y += 1) {
    for (let x = 11; x < 21; x += 1) {
      setPixel(rgba, size, x, y, spec.accent);
    }
  }
  for (let y = 5; y < 29; y += 1) {
    setPixel(rgba, size, 9, y, outline);
    setPixel(rgba, size, 22, y, outline);
  }

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

mkdirSync(outDir, { recursive: true });

for (const spec of NPC_SPECS) {
  const png = drawNpcPlaceholder(spec);
  const outPath = path.join(outDir, spec.file);
  writeFileSync(outPath, png);
  const hash = createHash('sha256').update(png).digest('hex').slice(0, 12);
  console.log(`[seed:npc] ${spec.file} (${png.length} bytes) sha256:${hash}`);
}

console.log(`[seed:npc] ${NPC_SPECS.length} PNGs em public/assets/npcs/`);
