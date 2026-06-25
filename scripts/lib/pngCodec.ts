/**
 * Decoder/encoder PNG mínimo em Node puro (RGBA8, sem interlace).
 * Suporta reversão dos filtros 0–4 (None/Sub/Up/Average/Paeth) — necessário
 * para ler PNGs externos (Craftpix), diferente do leitor ingênuo do atlas legado.
 */
import { deflateSync, inflateSync } from 'node:zlib';

export type RgbaImage = {
  readonly width: number;
  readonly height: number;
  readonly rgba: Buffer;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

let crcTable: Uint32Array | null = null;
function crc32(buffer: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
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

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(data: Buffer): RgbaImage {
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('[pngCodec] Assinatura PNG inválida.');
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  const interlace = data[28];

  if (bitDepth !== 8) throw new Error(`[pngCodec] bitDepth ${bitDepth} não suportado.`);
  if (interlace !== 0) throw new Error('[pngCodec] PNG interlaçado não suportado.');
  if (colorType !== 6 && colorType !== 2) {
    throw new Error(`[pngCodec] colorType ${colorType} não suportado (use RGBA/RGB).`);
  }

  const channels = colorType === 6 ? 4 : 3;

  let offset = 8;
  const idatParts: Buffer[] = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunkData = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idatParts.push(chunkData);
    if (type === 'IEND') break;
    offset += 12 + length;
  }

  const inflated = inflateSync(Buffer.concat(idatParts));
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);
  const prevRow = Buffer.alloc(stride);
  const curRow = Buffer.alloc(stride);

  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src]!;
    src += 1;
    for (let i = 0; i < stride; i += 1) {
      const raw = inflated[src + i]!;
      const a = i >= channels ? curRow[i - channels]! : 0;
      const b = prevRow[i]!;
      const c = i >= channels ? prevRow[i - channels]! : 0;
      let value: number;
      switch (filter) {
        case 0: value = raw; break;
        case 1: value = raw + a; break;
        case 2: value = raw + b; break;
        case 3: value = raw + Math.floor((a + b) / 2); break;
        case 4: value = raw + paeth(a, b, c); break;
        default: throw new Error(`[pngCodec] Filtro ${filter} inválido na linha ${y}.`);
      }
      curRow[i] = value & 0xff;
    }
    src += stride;

    for (let x = 0; x < width; x += 1) {
      const di = (y * width + x) * 4;
      const si = x * channels;
      rgba[di] = curRow[si]!;
      rgba[di + 1] = curRow[si + 1]!;
      rgba[di + 2] = curRow[si + 2]!;
      rgba[di + 3] = channels === 4 ? curRow[si + 3]! : 255;
    }

    curRow.copy(prevRow);
  }

  return { width, height, rgba };
}

export function encodePng(image: RgbaImage): Buffer {
  const { width, height, rgba } = image;
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

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function createRgbaImage(width: number, height: number): RgbaImage {
  return { width, height, rgba: Buffer.alloc(width * height * 4, 0) };
}

export function getPixel(image: RgbaImage, x: number, y: number): [number, number, number, number] {
  const i = (y * image.width + x) * 4;
  return [image.rgba[i]!, image.rgba[i + 1]!, image.rgba[i + 2]!, image.rgba[i + 3]!];
}

export function setPixel(
  image: RgbaImage,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.rgba[i] = rgba[0];
  image.rgba[i + 1] = rgba[1];
  image.rgba[i + 2] = rgba[2];
  image.rgba[i + 3] = rgba[3];
}

/** Recorta uma sub-região retangular. */
export function cropRegion(source: RgbaImage, sx: number, sy: number, w: number, h: number): RgbaImage {
  const out = createRgbaImage(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = getPixel(source, sx + x, sy + y);
      setPixel(out, x, y, p);
    }
  }
  return out;
}

/** Reamostra por vizinho mais próximo — preserva nitidez de pixel art. */
export function nearestResize(source: RgbaImage, targetW: number, targetH: number): RgbaImage {
  const out = createRgbaImage(targetW, targetH);
  for (let y = 0; y < targetH; y += 1) {
    const sy = Math.min(source.height - 1, Math.floor((y * source.height) / targetH));
    for (let x = 0; x < targetW; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x * source.width) / targetW));
      setPixel(out, x, y, getPixel(source, sx, sy));
    }
  }
  return out;
}
