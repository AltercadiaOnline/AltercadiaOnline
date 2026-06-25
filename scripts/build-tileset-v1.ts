/**
 * Empacota PNGs individuais em public/assets/tilesets/tileset_v1.png.
 * Coordenadas devem bater com src/game/AssetRegistry.ts (SSOT).
 *
 * Uso: npm run build:tileset
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';
import {
  getAssetFrame,
  TILESET_ATLAS_FILE,
  TILESET_ATLAS_HEIGHT,
  TILESET_ATLAS_WIDTH,
  type LegacyAssetId,
} from '../src/game/AssetRegistry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'tilesets');
const outFile = path.join(outDir, TILESET_ATLAS_FILE);

/**
 * Lista de permissão explícita — o ÚNICO conteúdo que entra no atlas estático.
 * Build determinístico: nada é escaneado automaticamente. Tudo que não estiver
 * aqui é tratado como asset dinâmico, resolvido pelo renderer direto do PNG no
 * sistema de arquivos (packs canônicos em public/assets/**).
 */
const ATLAS_ASSETS: readonly LegacyAssetId[] = [
  // Chão (tileset 40×40)
  'chao_grama',
  'chao_praca',
  'chao_rua',
  'parede_concreto',
  // Props urbanos legados
  'poste_metal',
  'lixeira',
  'correio',
  'hidrante',
  'extintor',
  'banco',
  'grafite',
  // Personagens base
  'player_idle',
  'npc_anciao',
  'npc_treinador',
  'npc_vendedor',
];

const SOURCE_BY_ID: Partial<Record<LegacyAssetId, string>> = {
  chao_grama: 'public/assets/terrain/tiles/ground_grass.png',
  chao_praca: 'public/assets/terrain/tiles/ground_plaza.png',
  chao_rua: 'public/assets/terrain/tiles/ground_road.png',
  poste_metal: 'public/assets/urban/props/street_light.png',
  lixeira: 'public/assets/urban/props/trash_can.png',
  correio: 'public/assets/urban/props/mailbox.png',
  hidrante: 'public/assets/urban/props/fire_hydrant.png',
  extintor: 'public/assets/urban/props/fire_extinguisher.png',
  banco: 'public/assets/urban/props/park_bench.png',
  grafite: 'public/assets/urban/props/graffiti_wall.png',
  npc_anciao: 'public/assets/npcs/npc_anciao.png',
  npc_treinador: 'public/assets/npcs/npc_treinador.png',
  npc_vendedor: 'public/assets/npcs/npc_treinador.png',
  player_idle:
    'public/assets/player/player.teste.asset/Pixel_art_character_sprite_front/rotations/south.png',
};

function crc32(buffer: Buffer): number {
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

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function createCanvas(width: number, height: number) {
  const rgba = Buffer.alloc(width * height * 4, 0);
  return {
    width,
    height,
    rgba,
    set(x: number, y: number, rgb: readonly [number, number, number], alpha = 255) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = (y * width + x) * 4;
      rgba[i] = rgb[0];
      rgba[i + 1] = rgb[1];
      rgba[i + 2] = rgb[2];
      rgba[i + 3] = alpha;
    },
    blit(source: { rgba: Buffer; width: number; height: number }, dx: number, dy: number) {
      for (let y = 0; y < source.height; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          const si = (y * source.width + x) * 4;
          const alpha = source.rgba[si + 3] ?? 0;
          if (alpha === 0) continue;
          this.set(dx + x, dy + y, [source.rgba[si]!, source.rgba[si + 1]!, source.rgba[si + 2]!], alpha);
        }
      }
    },
  };
}

function encodePng(canvas: ReturnType<typeof createCanvas>): Buffer {
  const { width, height, rgba } = canvas;
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
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function readPng(filePath: string): { width: number; height: number; rgba: Buffer } {
  const abs = path.join(root, filePath);
  const data = readFileSync(abs);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  let offset = 8;
  let idat = Buffer.alloc(0);
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunkData = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') {
      idat = Buffer.concat([idat, chunkData]);
    }
    if (type === 'IEND') break;
    offset += 12 + length;
  }

  const inflated = inflateSync(idat);
  const rgba = Buffer.alloc(width * height * 4);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    src += 1;
    for (let x = 0; x < width; x += 1) {
      const di = (y * width + x) * 4;
      rgba[di] = inflated[src]!;
      rgba[di + 1] = inflated[src + 1]!;
      rgba[di + 2] = inflated[src + 2]!;
      rgba[di + 3] = inflated[src + 3]!;
      src += 4;
    }
  }
  return { width, height, rgba };
}

function drawWallTile(size: number) {
  const c = createCanvas(size, size);
  const concrete: [number, number, number] = [107, 111, 117];
  const dark: [number, number, number] = [74, 78, 84];
  const light: [number, number, number] = [138, 143, 150];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const brickY = Math.floor(y / 8);
      const brickX = Math.floor((x + (brickY % 2) * 4) / 8);
      const mortar = (y % 8 === 0) || (x % 8 === 0);
      if (mortar) c.set(x, y, dark);
      else c.set(x, y, (brickX + brickY) % 2 ? concrete : light);
    }
  }
  return c;
}

function cropCenter(source: { width: number; height: number; rgba: Buffer }, cropW: number, cropH: number) {
  const sx = Math.max(0, Math.floor((source.width - cropW) / 2));
  const sy = Math.max(0, Math.floor((source.height - cropH) / 2));
  const rgba = Buffer.alloc(cropW * cropH * 4, 0);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const si = ((sy + y) * source.width + (sx + x)) * 4;
      const di = (y * cropW + x) * 4;
      rgba[di] = source.rgba[si] ?? 0;
      rgba[di + 1] = source.rgba[si + 1] ?? 0;
      rgba[di + 2] = source.rgba[si + 2] ?? 0;
      rgba[di + 3] = source.rgba[si + 3] ?? 0;
    }
  }
  return { width: cropW, height: cropH, rgba };
}

function resolveSource(id: LegacyAssetId) {
  if (id === 'parede_concreto') {
    return drawWallTile(40);
  }

  const rel = SOURCE_BY_ID[id];
  if (!rel) {
    throw new Error(`[build:tileset] Fonte ausente para ${id}`);
  }

  const png = readPng(rel);
  const frame = getAssetFrame(id);
  if (png.width === frame.width && png.height === frame.height) {
    return png;
  }

  if (id === 'player_idle') {
    return cropCenter(png, frame.width, frame.height);
  }

  return png;
}

mkdirSync(outDir, { recursive: true });
mkdirSync(path.join(root, 'public', 'assets', 'entities'), { recursive: true });
mkdirSync(path.join(root, 'public', 'assets', 'characters'), { recursive: true });

const atlas = createCanvas(TILESET_ATLAS_WIDTH, TILESET_ATLAS_HEIGHT);

for (const id of ATLAS_ASSETS) {
  const frame = getAssetFrame(id);
  const source = resolveSource(id);
  atlas.blit(source, frame.x, frame.y);
  console.log(`[build:tileset] ${id} → (${frame.x},${frame.y}) ${frame.width}×${frame.height}`);
}

const png = encodePng(atlas);
writeFileSync(outFile, png);
const hash = createHash('md5').update(png).digest('hex').slice(0, 8);
console.log(`[build:tileset] ${outFile} ${TILESET_ATLAS_WIDTH}×${TILESET_ATLAS_HEIGHT} (${hash})`);
