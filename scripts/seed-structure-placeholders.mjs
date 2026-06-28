/**
 * Estruturas urbanas — casas e edifícios da Cidade 01 (múltiplos de 32px).
 * Saída: public/assets/structures/*.png
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'structures');
const TILE = 32;

const P = {
  outline: [30, 32, 36],
  concrete: [107, 111, 117],
  concreteDark: [74, 78, 84],
  brick: [139, 74, 58],
  brickDark: [107, 53, 48],
  brickLight: [168, 90, 72],
  metal: [90, 98, 112],
  metalDark: [61, 68, 80],
  metalLight: [122, 132, 148],
  roof: [58, 62, 72],
  roofDark: [42, 46, 54],
  window: [74, 200, 184],
  windowGlow: [120, 220, 200],
  door: [90, 64, 40],
  neonTeal: [74, 200, 184],
  neonAmber: [232, 168, 72],
  neonMagenta: [200, 120, 216],
  awning: [180, 60, 55],
  awningStripe: [220, 90, 70],
  wood: [120, 86, 56],
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
  const set = (x, y, rgb, a = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    rgba[i] = rgb[0]; rgba[i + 1] = rgb[1]; rgba[i + 2] = rgb[2]; rgba[i + 3] = a;
  };
  const fillRect = (x0, y0, w, h, rgb) => {
    for (let y = y0; y < y0 + h; y += 1)
      for (let x = x0; x < x0 + w; x += 1) set(x, y, rgb);
  };
  const strokeRect = (x0, y0, w, h, rgb) => {
    for (let x = x0; x < x0 + w; x += 1) { set(x, y0, rgb); set(x, y0 + h - 1, rgb); }
    for (let y = y0; y < y0 + h; y += 1) { set(x0, y, rgb); set(x0 + w - 1, y, rgb); }
  };
  return { width, height, rgba, set, fillRect, strokeRect };
}

function encodePng(canvas) {
  const { width, height, rgba } = canvas;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function shade(rgb, x, y, w, h) {
  const t = (x / Math.max(1, w - 1)) * 0.45 + (1 - y / Math.max(1, h - 1)) * 0.55;
  const f = 0.82 + t * 0.28;
  return [Math.min(255, Math.round(rgb[0] * f)), Math.min(255, Math.round(rgb[1] * f)), Math.min(255, Math.round(rgb[2] * f))];
}

function drawHouse(w, h, opts = {}) {
  const c = createCanvas(w, h);
  const wall = opts.wall ?? P.brick;
  const roofH = Math.max(16, Math.floor(h * 0.28));
  const baseH = 6;
  const bodyY = h - baseH - Math.floor(h * 0.62);
  const bodyH = h - baseH - bodyY - roofH;

  c.fillRect(0, h - baseH, w, baseH, P.concreteDark);
  c.strokeRect(0, h - baseH, w, baseH, P.outline);

  for (let y = bodyY; y < bodyY + bodyH; y += 1) {
    for (let x = 4; x < w - 4; x += 1) {
      const edge = x <= 5 || x >= w - 6 || y === bodyY || y === bodyY + bodyH - 1;
      c.set(x, y, edge ? P.outline : shade(wall, x, y, w, h));
    }
  }

  // Telhado inclinado
  for (let row = 0; row < roofH; row += 1) {
    const inset = Math.floor(row * 0.6);
    for (let x = 6 + inset; x < w - 6 - inset; x += 1) {
      c.set(x, bodyY - roofH + row, shade(row % 2 ? P.roof : P.roofDark, x, row, w, roofH));
    }
  }

  // Janelas
  const winW = 10; const winH = 12;
  for (const wx of opts.windows ?? [Math.floor(w * 0.22), Math.floor(w * 0.62)]) {
    const wy = bodyY + Math.floor(bodyH * 0.25);
    c.fillRect(wx, wy, winW, winH, P.metalDark);
    c.fillRect(wx + 1, wy + 1, winW - 2, winH - 2, opts.neon ? P.windowGlow : P.window);
    c.strokeRect(wx, wy, winW, winH, P.outline);
  }

  // Porta
  const doorW = 14;
  const doorX = Math.floor(w / 2 - doorW / 2);
  const doorY = bodyY + bodyH - 22;
  c.fillRect(doorX, doorY, doorW, 22, P.door);
  c.strokeRect(doorX, doorY, doorW, 22, P.outline);

  if (opts.neon) {
    c.set(6, bodyY + 4, P.neonTeal);
    c.set(7, bodyY + 3, P.neonAmber);
  }
  return c;
}

function drawMarket(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(0, h - 8, w, 8, P.concreteDark);
  const bodyY = 40;
  for (let y = bodyY; y < h - 8; y += 1) {
    for (let x = 8; x < w - 8; x += 1) {
      c.set(x, y, shade(P.brickLight, x, y, w, h));
      if (x === 8 || x === w - 9 || y === bodyY) c.set(x, y, P.outline);
    }
  }
  // Toldos listrados
  for (let x = 10; x < w - 10; x += 1) {
    const stripe = Math.floor(x / 8) % 2;
    for (let y = 18; y < 38; y += 1) c.set(x, y, stripe ? P.awning : P.awningStripe);
  }
  for (let x = 10; x < w - 10; x += 1) c.set(x, 17, P.outline);
  // Entrada ampla
  c.fillRect(Math.floor(w * 0.35), h - 38, Math.floor(w * 0.3), 30, P.metalDark);
  c.set(Math.floor(w * 0.5), 12, P.neonMagenta);
  return c;
}

function drawFoodStalls(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(0, h - 6, w, 6, P.concreteDark);
  const stallW = Math.floor(w / 3);
  for (let i = 0; i < 3; i += 1) {
    const sx = 6 + i * stallW;
    for (let y = h - 50; y < h - 6; y += 1) {
      for (let x = sx; x < sx + stallW - 4; x += 1) c.set(x, y, shade(P.wood, x, y, w, h));
    }
    for (let x = sx; x < sx + stallW - 4; x += 1) {
      c.set(x, h - 62, (x % 6 < 3) ? P.awning : P.awningStripe);
      c.set(x, h - 63, P.outline);
    }
  }
  return c;
}

function drawArena(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(4, h - 10, w - 8, 10, P.concrete);
  const inset = 12;
  c.fillRect(inset, inset + 20, w - inset * 2, h - inset - 30, P.metalDark);
  c.strokeRect(inset, inset + 20, w - inset * 2, h - inset - 30, P.neonAmber);
  c.fillRect(w / 2 - 20, h / 2 - 10, 40, 20, P.roofDark);
  c.set(w / 2, inset + 10, P.neonTeal);
  return c;
}

function drawRefractionBooth(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(0, h - 8, w, 8, P.concreteDark);
  for (let y = 24; y < h - 8; y += 1) {
    for (let x = 10; x < w - 10; x += 1) c.set(x, y, shade(P.metal, x, y, w, h));
  }
  c.fillRect(20, 8, w - 40, 18, P.neonTeal);
  c.fillRect(30, 30, w - 60, 40, [20, 28, 38]);
  c.set(w / 2, 14, P.outline);
  return c;
}

function drawTowerWing(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(0, h - 8, w, 8, P.concreteDark);
  for (let y = 16; y < h - 8; y += 1) {
    for (let x = 8; x < w - 8; x += 1) {
      c.set(x, y, shade(P.metal, x, y, w, h));
      if (x === 8 || x === w - 9) c.set(x, y, P.outline);
    }
  }
  for (let y = 0; y < 20; y += 1) {
    for (let x = 20 + y; x < w - 20 - y; x += 1) c.set(x, y + 4, P.roofDark);
  }
  c.set(20, 30, P.windowGlow);
  c.set(w - 28, 40, P.window);
  return c;
}

function drawTowerSpire(w, h) {
  const c = createCanvas(w, h);
  c.fillRect(0, h - 6, w, 6, P.concreteDark);
  for (let y = 20; y < h - 6; y += 1) {
    for (let x = 16; x < w - 16; x += 1) c.set(x, y, shade(P.metalLight, x, y, w, h));
  }
  for (let y = 0; y < 24; y += 1) {
    const inset = Math.floor(y * 0.8);
    for (let x = 24 + inset; x < w - 24 - inset; x += 1) c.set(x, y, P.neonTeal);
  }
  c.set(w / 2, 4, P.neonAmber);
  return c;
}

function drawBank(w, h) {
  const c = drawHouse(w, h, { wall: P.concrete, neon: true, windows: [20, w - 36] });
  c.fillRect(12, 20, w - 24, 8, P.metalLight);
  c.set(w / 2 - 1, 14, P.neonAmber);
  return c;
}

const ASSETS = [
  { id: 'casa_anciao', w: 200, h: 160, draw: () => drawHouse(200, 160, { wall: P.brickDark, neon: true }) },
  { id: 'casa_mercenario', w: 160, h: 120, draw: () => drawHouse(160, 120, { wall: P.brick }) },
  { id: 'casa_alquimista', w: 160, h: 120, draw: () => drawHouse(160, 120, { wall: P.brickLight, neon: true }) },
  { id: 'casa_ferreiro', w: 160, h: 120, draw: () => drawHouse(160, 120, { wall: P.metalDark }) },
  { id: 'casa_vendedor', w: 160, h: 120, draw: () => drawHouse(160, 120, { wall: P.brick, neon: true }) },
  { id: 'casa_banqueiro', w: 160, h: 120, draw: () => drawBank(160, 120) },
  { id: 'food_stalls', w: 200, h: 160, draw: () => drawFoodStalls(200, 160) },
  { id: 'market_hall', w: 280, h: 200, draw: () => drawMarket(280, 200) },
  { id: 'arena_tournament', w: 160, h: 160, draw: () => drawArena(160, 160) },
  { id: 'refraction_booth', w: 280, h: 160, draw: () => drawRefractionBooth(280, 160) },
  { id: 'tower_wing', w: 160, h: 120, draw: () => drawTowerWing(160, 120) },
  { id: 'tower_spire', w: 120, h: 80, draw: () => drawTowerSpire(120, 80) },
];

mkdirSync(outDir, { recursive: true });

for (const asset of ASSETS) {
  const canvas = asset.draw();
  const png = encodePng(canvas);
  writeFileSync(path.join(outDir, `${asset.id}.png`), png);
  const hash = createHash('md5').update(png).digest('hex').slice(0, 8);
  console.log(`[seed] ${asset.id}: ${asset.w}x${asset.h} (${hash})`);
}

console.log(`[seed] Estruturas em ${outDir}`);
