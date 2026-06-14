/**
 * Gera PNGs pixel art — props urbanos (Urban Pixel Art Detalhado).
 * Saída: public/assets/urban/props/*.png
 *
 * Spec: múltiplos de 40px · alpha limpo · sem sombra projetada · luz top-right.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'urban', 'props');

/** Paleta urbana — tons de concreto, metal, néon suave. */
const P = {
  outline: [30, 32, 36],
  concrete: [107, 111, 117],
  concreteDark: [74, 78, 84],
  concreteLight: [138, 143, 150],
  brick: [139, 74, 58],
  brickDark: [107, 53, 48],
  brickLight: [168, 90, 72],
  asphalt: [46, 50, 56],
  metal: [90, 98, 112],
  metalDark: [61, 68, 80],
  metalLight: [122, 132, 148],
  rust: [139, 90, 60],
  rustDark: [107, 64, 40],
  neonTeal: [74, 200, 184],
  neonAmber: [232, 168, 72],
  neonMagenta: [200, 120, 216],
  neonGlow: [120, 220, 200],
  wood: [120, 86, 56],
  woodDark: [90, 64, 40],
  woodLight: [150, 110, 72],
  hydrantRed: [180, 50, 45],
  hydrantDark: [130, 35, 32],
  hydrantLight: [220, 80, 72],
  extinguisherRed: [200, 56, 48],
  extinguisherDark: [140, 38, 34],
  graffitiCyan: [60, 180, 200],
  graffitiPink: [220, 80, 140],
  graffitiYellow: [240, 200, 60],
  graffitiPurple: [160, 90, 200],
  glass: [180, 210, 220],
  glassGlow: [255, 240, 180],
};

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

function createCanvas(width, height) {
  const rgba = Buffer.alloc(width * height * 4, 0);
  const get = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const i = (y * width + x) * 4;
    return [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
  };
  const set = (x, y, rgb, a = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    rgba[i] = rgb[0];
    rgba[i + 1] = rgb[1];
    rgba[i + 2] = rgb[2];
    rgba[i + 3] = a;
  };
  const fillRect = (x0, y0, w, h, rgb) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) set(x, y, rgb);
    }
  };
  const strokeRect = (x0, y0, w, h, rgb) => {
    for (let x = x0; x < x0 + w; x += 1) {
      set(x, y0, rgb);
      set(x, y0 + h - 1, rgb);
    }
    for (let y = y0; y < y0 + h; y += 1) {
      set(x0, y, rgb);
      set(x0 + w - 1, y, rgb);
    }
  };
  return { width, height, rgba, set, get, fillRect, strokeRect };
}

function encodePng(canvas) {
  const { width, height, rgba } = canvas;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
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

/** Luz vindo do canto superior direito — highlight em (x,y) se mais à direita/cima. */
function shade(rgb, x, y, w, h) {
  const t = (x / Math.max(1, w - 1)) * 0.5 + (1 - y / Math.max(1, h - 1)) * 0.5;
  const factor = 0.85 + t * 0.3;
  return [
    Math.min(255, Math.round(rgb[0] * factor)),
    Math.min(255, Math.round(rgb[1] * factor)),
    Math.min(255, Math.round(rgb[2] * factor)),
  ];
}

function drawStreetLight() {
  const c = createCanvas(40, 80);
  const cx = 20;
  // Base concreto
  c.fillRect(14, 72, 12, 6, P.concreteDark);
  c.strokeRect(14, 72, 12, 6, P.outline);
  // Poste metálico retrô
  for (let y = 18; y < 72; y += 1) {
    const w = y < 30 ? 4 : 3;
    const x0 = cx - Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x += 1) {
      c.set(x, y, shade(P.metal, x, y, 40, 80));
      if (x === x0 || x === x0 + w - 1) c.set(x, y, P.outline);
    }
  }
  // Braço do poste
  for (let x = cx; x < 34; x += 1) {
    c.set(x, 16, P.metalDark);
    c.set(x, 17, P.metal);
    c.set(x, 18, P.outline);
  }
  // Luminária vintage
  c.fillRect(28, 6, 10, 12, P.metalDark);
  c.fillRect(29, 7, 8, 10, P.metal);
  c.strokeRect(28, 6, 10, 12, P.outline);
  // Vidro com néon âmbar suave
  c.fillRect(30, 8, 6, 7, P.glassGlow);
  c.set(31, 9, P.neonAmber);
  c.set(32, 9, P.neonGlow);
  c.set(33, 10, P.neonAmber);
  c.set(32, 11, P.neonTeal);
  return c;
}

function drawTrashCan() {
  const c = createCanvas(40, 40);
  const x0 = 10;
  const y0 = 8;
  const w = 20;
  const h = 28;
  // Tampa
  c.fillRect(x0 - 1, y0, w + 2, 4, P.metalDark);
  c.fillRect(x0, y0 + 1, w, 2, P.metalLight);
  c.strokeRect(x0 - 1, y0, w + 2, 4, P.outline);
  // Corpo cilíndrico
  for (let y = y0 + 4; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const edge = x === x0 || x === x0 + w - 1;
      c.set(x, y, edge ? P.outline : shade(P.metal, x, y, 40, 40));
    }
  }
  // Ferrugem
  c.set(12, 22, P.rust);
  c.set(13, 23, P.rustDark);
  c.set(14, 22, P.rust);
  c.set(26, 28, P.rust);
  c.set(27, 29, P.rustDark);
  // Faixa asfalto na base
  c.fillRect(8, 35, 24, 3, P.asphalt);
  return c;
}

function drawMailbox() {
  const c = createCanvas(40, 40);
  // Poste fino
  for (let y = 14; y < 36; y += 1) {
    c.set(19, y, P.metalDark);
    c.set(20, y, shade(P.metal, 20, y, 40, 40));
    c.set(21, y, P.outline);
  }
  // Caixa azul-cinza urbana
  c.fillRect(8, 10, 24, 14, P.metalDark);
  for (let y = 10; y < 24; y += 1) {
    for (let x = 8; x < 32; x += 1) {
      c.set(x, y, shade(P.concrete, x, y, 40, 40));
    }
  }
  c.strokeRect(8, 10, 24, 14, P.outline);
  // Slot
  c.fillRect(22, 14, 8, 2, P.outline);
  c.fillRect(23, 15, 6, 1, P.asphalt);
  // Néon teal no canto (placa)
  c.set(10, 12, P.neonTeal);
  c.set(11, 12, P.neonGlow);
  // Base
  c.fillRect(14, 34, 12, 4, P.concreteDark);
  c.strokeRect(14, 34, 12, 4, P.outline);
  return c;
}

function drawFireHydrant() {
  const c = createCanvas(40, 40);
  const cx = 20;
  // Corpo
  for (let y = 14; y < 34; y += 1) {
    for (let x = 12; x < 28; x += 1) {
      const edge = x === 12 || x === 27;
      c.set(x, y, edge ? P.outline : shade(P.hydrantRed, x, y, 40, 40));
    }
  }
  // Topo bolboso
  c.fillRect(14, 10, 12, 6, P.hydrantDark);
  c.fillRect(15, 11, 10, 4, shade(P.hydrantLight, 20, 12, 40, 40));
  c.strokeRect(14, 10, 12, 6, P.outline);
  // Bicos laterais metálicos
  c.fillRect(8, 18, 5, 4, P.metalDark);
  c.fillRect(27, 18, 5, 4, P.metalDark);
  c.set(8, 18, P.outline);
  c.set(31, 18, P.outline);
  // Parafuso central
  c.set(cx, 20, P.metalLight);
  c.set(cx, 21, P.metal);
  // Base
  c.fillRect(10, 32, 20, 4, P.concreteDark);
  c.strokeRect(10, 32, 20, 4, P.outline);
  return c;
}

function drawParkBench() {
  const c = createCanvas(80, 40);
  // Pernas metal
  for (const legX of [8, 22, 54, 68]) {
    c.fillRect(legX, 28, 4, 10, P.metalDark);
    c.strokeRect(legX, 28, 4, 10, P.outline);
  }
  // Assento madeira — tábuas
  for (let i = 0; i < 5; i += 1) {
    const y = 18 + i * 2;
    for (let x = 6; x < 74; x += 1) {
      const wood = i % 2 === 0 ? P.wood : P.woodDark;
      c.set(x, y, shade(wood, x, y, 80, 40));
      if (x === 6 || x === 73) c.set(x, y, P.outline);
    }
  }
  // Encosto
  for (let y = 10; y < 18; y += 1) {
    for (let x = 10; x < 70; x += 1) {
      c.set(x, y, shade(P.woodLight, x, y, 80, 40));
      if (y === 10 || y === 17) c.set(x, y, P.outline);
    }
  }
  // Braços metal
  c.fillRect(6, 16, 4, 14, P.metal);
  c.fillRect(70, 16, 4, 14, P.metal);
  c.strokeRect(6, 16, 4, 14, P.outline);
  c.strokeRect(70, 16, 4, 14, P.outline);
  return c;
}

function drawFireExtinguisher() {
  const c = createCanvas(40, 40);
  // Suporte parede
  c.fillRect(6, 8, 4, 28, P.metalDark);
  c.strokeRect(6, 8, 4, 28, P.outline);
  // Cilindro vermelho
  for (let y = 10; y < 34; y += 1) {
    for (let x = 14; x < 28; x += 1) {
      const edge = x === 14 || x === 27;
      c.set(x, y, edge ? P.outline : shade(P.extinguisherRed, x, y, 40, 40));
    }
  }
  // Bico e manômetro
  c.fillRect(26, 12, 8, 3, P.metal);
  c.set(27, 13, P.metalLight);
  c.strokeRect(26, 12, 8, 3, P.outline);
  c.set(18, 16, P.metalLight);
  c.set(19, 16, P.outline);
  // Faixa amarela
  c.fillRect(14, 22, 14, 3, P.neonAmber);
  c.strokeRect(14, 22, 14, 3, P.outline);
  // Base
  c.fillRect(12, 32, 18, 4, P.extinguisherDark);
  c.strokeRect(12, 32, 18, 4, P.outline);
  return c;
}

function drawGraffitiWall() {
  const c = createCanvas(40, 40);
  // Parede tijolo
  for (let y = 4; y < 36; y += 1) {
    for (let x = 2; x < 38; x += 1) {
      const row = Math.floor(y / 6);
      const offset = (row % 2) * 5;
      const inMortar = (y % 6 === 0) || ((x + offset) % 10 === 0);
      c.set(x, y, inMortar ? P.concreteDark : shade(
        ((x + row) % 3 === 0) ? P.brickDark : P.brick,
        x, y, 40, 40,
      ));
    }
  }
  c.strokeRect(2, 4, 36, 32, P.outline);
  // Grafite — tag abstrata (sem sombra projetada)
  const spray = (px, py, rgb) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      c.set(px + dx, py + dy, rgb);
    }
  };
  spray(8, 12, P.graffitiCyan);
  spray(12, 10, P.graffitiPink);
  spray(16, 14, P.graffitiYellow);
  spray(22, 11, P.graffitiPurple);
  spray(26, 15, P.graffitiCyan);
  // Linha de tag
  for (let x = 8; x < 32; x += 1) {
    c.set(x, 24, x % 4 === 0 ? P.graffitiPink : P.graffitiCyan);
  }
  c.set(30, 22, P.neonMagenta);
  c.set(31, 23, P.neonTeal);
  // Contorno escuro no grafite
  c.set(7, 12, P.outline);
  c.set(8, 11, P.outline);
  c.set(21, 10, P.outline);
  return c;
}

const ASSETS = [
  { id: 'street_light', draw: drawStreetLight },
  { id: 'trash_can', draw: drawTrashCan },
  { id: 'mailbox', draw: drawMailbox },
  { id: 'fire_hydrant', draw: drawFireHydrant },
  { id: 'park_bench', draw: drawParkBench },
  { id: 'fire_extinguisher', draw: drawFireExtinguisher },
  { id: 'graffiti_wall', draw: drawGraffitiWall },
];

mkdirSync(outDir, { recursive: true });

for (const asset of ASSETS) {
  const canvas = asset.draw();
  const png = encodePng(canvas);
  const filePath = path.join(outDir, `${asset.id}.png`);
  writeFileSync(filePath, png);
  const hash = createHash('md5').update(png).digest('hex').slice(0, 8);
  console.log(`[seed] ${asset.id}: ${canvas.width}x${canvas.height} (${hash})`);
}

console.log(`[seed] Props urbanos em ${outDir}`);
