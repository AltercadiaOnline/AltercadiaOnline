/**
 * Gera PNGs placeholder para combate (24×24 projéteis, 32×32 vfx).
 * Saída: public/assets/combat/{projectiles,vfx,icons}/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicCombatDir = path.join(root, 'public', 'assets', 'combat');

const PROJECTILES = [
  { file: 'projectile_basic.png', color: [255, 180, 80], size: 24 },
  { file: 'slash.png', color: [220, 220, 255], size: 24 },
  { file: 'fireball.png', color: [255, 90, 30], size: 24 },
  { file: 'ice_shard.png', color: [120, 200, 255], size: 24 },
  { file: 'shock.png', color: [255, 255, 100], size: 24 },
  { file: 'heal_glow.png', color: [100, 255, 140], size: 24 },
  { file: 'block_impact.png', color: [180, 180, 200], size: 24 },
];

const VFX = [
  { file: 'impact_dust.png', color: [200, 160, 100], size: 32 },
  { file: 'hit_flash.png', color: [255, 255, 255], size: 32 },
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
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function drawOrbPixels(width, height, rgb) {
  const rgba = Buffer.alloc(width * height * 4, 0);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const edge = 1 - dist / radius;
        const alpha = Math.round(255 * Math.min(1, edge * 1.2));
        set(x, y, rgb[0], rgb[1], rgb[2], alpha);
      }
    }
  }

  return rgba;
}

function encodePng(rgba, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeOrb(dir, { file, color, size }) {
  mkdirSync(dir, { recursive: true });
  const png = encodePng(drawOrbPixels(size, size, color), size, size);
  writeFileSync(path.join(dir, file), png);
  console.log(`[seed] ${path.relative(publicCombatDir, path.join(dir, file))}`);
}

const projectileDir = path.join(publicCombatDir, 'projectiles');
const vfxDir = path.join(publicCombatDir, 'vfx');
const iconDir = path.join(publicCombatDir, 'icons');

for (const entry of PROJECTILES) {
  writeOrb(projectileDir, entry);
}

for (const entry of VFX) {
  writeOrb(vfxDir, entry);
}

mkdirSync(iconDir, { recursive: true });
console.log(`[seed] icons/ — adicione PNGs de habilidades manualmente ou via pipeline de arte`);
console.log(`[seed] Placeholders de combate em ${publicCombatDir}`);
