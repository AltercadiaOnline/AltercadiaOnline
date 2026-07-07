/**
 * Texturas procedurais de fallback — sempre que um PNG falhar (404, atlas, preload),
 * o front desenha um placeholder em canvas em vez de deixar buraco visual.
 */
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';

export type PhaserPlaceholderTextures = {
  exists: (key: string) => boolean;
  addCanvas: (key: string, canvas: HTMLCanvasElement) => unknown;
  get: (key: string) => {
    setFilter: (mode: number) => void;
    has?: (frame: string) => boolean;
  };
};

export type PlaceholderKind = 'creature' | 'npc' | 'player' | 'prop' | 'tile' | 'generic';

export type PhaserPlaceholderOptions = {
  /** Chave Phaser final — deve bater com a chave do asset que falhou no loader. */
  readonly textureKey: string;
  readonly seed: string;
  readonly kind: PlaceholderKind;
  readonly width: number;
  readonly height: number;
  readonly label?: string;
};

const PLACEHOLDER_PREFIX = 'ph-placeholder';

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

function blendHue(base: number, target: number, factor: number): number {
  const diff = ((target - base + 540) % 360) - 180;
  return base + diff * factor;
}

function clampDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(8, Math.round(value));
}

function abbreviateLabel(seed: string, max = 3): string {
  const cleaned = seed.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, max).toUpperCase();
  return parts.map((part) => part[0]!).join('').slice(0, max).toUpperCase();
}

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  seed: string,
  kind: 'creature' | 'npc' | 'player',
  width: number,
  height: number,
): void {
  const rng = hashSeed(`${kind}:${seed}`);
  const baseHue = rng % 360;
  const targetHue = kind === 'player' ? 168 : kind === 'npc' ? 210 : 28;
  const hue = blendHue(baseHue, targetHue, kind === 'creature' ? 0.35 : 0.55);

  const body = hsl(hue, 56, 52);
  const bodyDark = hsl(hue, 52, 36);
  const bodyLight = hsl(hue, 62, 68);
  const belly = hsl(hue + 18, 48, 74);
  const outline = hsl(hue, 42, 16);

  const scale = Math.min(width / 48, height / 56);
  const cx = width / 2;
  const groundY = height - Math.max(2, 4 * scale);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);
  ctx.translate(-24, -52);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(24, 50, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyDark;
  for (const footX of [11, 37]) {
    ctx.beginPath();
    ctx.ellipse(footX, 46, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(24, 18, 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(24, 22, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const headY = -16;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(24, headY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = bodyDark;
  if (kind === 'npc') {
    ctx.fillRect(16, headY - 18, 16, 4);
  } else {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(24 + dir * 11, headY - 14, 4, 7, dir * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.fillStyle = bodyLight;
  ctx.beginPath();
  ctx.ellipse(30, headY - 4, 5, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const eyeY = headY + 1;
  for (const dir of [-1, 1]) {
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.ellipse(24 + dir * 6, eyeY, 3.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(24 + dir * 6 + dir, eyeY, 1.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTilePattern(
  ctx: CanvasRenderingContext2D,
  seed: string,
  width: number,
  height: number,
): void {
  const tile = DESIGN_CONFIG.TILE.SIZE;
  const hue = hashSeed(seed) % 360;
  const a = hsl(hue, 42, 42);
  const b = hsl(hue + 24, 38, 54);

  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const checker = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = checker ? a : b;
      ctx.fillRect(x, y, Math.min(tile, width - x), Math.min(tile, height - y));
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (width >= tile && height >= tile) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `bold ${Math.min(11, Math.floor(tile * 0.35))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', width / 2, height / 2);
  }
}

function drawPropPattern(
  ctx: CanvasRenderingContext2D,
  seed: string,
  width: number,
  height: number,
  label?: string,
): void {
  const hue = (hashSeed(seed) % 60) + 300;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = hsl(hue, 58, 38);
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  const step = Math.max(8, Math.round(Math.min(width, height) / 6));
  for (let offset = -height; offset < width + height; offset += step) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + height, height);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(8,8,12,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const text = label ?? abbreviateLabel(seed, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `bold ${Math.max(9, Math.min(14, Math.floor(Math.min(width, height) * 0.22)))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
}

function drawGenericPattern(
  ctx: CanvasRenderingContext2D,
  seed: string,
  width: number,
  height: number,
  label?: string,
): void {
  const hue = hashSeed(seed) % 360;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = hsl(hue, 18, 34);
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const text = label ?? abbreviateLabel(seed);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.max(9, Math.min(14, Math.floor(Math.min(width, height) * 0.22)))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  options: PhaserPlaceholderOptions,
): void {
  const width = clampDimension(options.width, 32);
  const height = clampDimension(options.height, 32);

  switch (options.kind) {
    case 'creature':
    case 'npc':
    case 'player':
      drawSilhouette(ctx, options.seed, options.kind, width, height);
      return;
    case 'tile':
      drawTilePattern(ctx, options.seed, width, height);
      return;
    case 'prop':
      drawPropPattern(ctx, options.seed, width, height, options.label);
      return;
    default:
      drawGenericPattern(ctx, options.seed, width, height, options.label);
  }
}

export function inferPlaceholderKind(textureKey: string, assetUrl?: string): PlaceholderKind {
  const haystack = `${textureKey} ${assetUrl ?? ''}`.toLowerCase();
  if (haystack.includes('player') || haystack.includes('altercadia-player')) return 'player';
  if (haystack.includes('creature') || haystack.includes('/creatures/')) return 'creature';
  if (haystack.includes('npc') || haystack.includes('/npcs/')) return 'npc';
  if (haystack.includes('tileset') || haystack.includes('/terrain/')) return 'tile';
  if (
    haystack.includes('/props/')
    || haystack.includes('/structures/')
    || haystack.includes('object')
  ) {
    return 'prop';
  }
  return 'generic';
}

export function defaultPlaceholderSize(kind: PlaceholderKind): { readonly w: number; readonly h: number } {
  switch (kind) {
    case 'player':
      return {
        w: GAME_ASSET_TARGETS.player.width,
        h: GAME_ASSET_TARGETS.player.height,
      };
    case 'creature':
    case 'npc':
      return {
        w: GAME_ASSET_TARGETS.npc.width,
        h: GAME_ASSET_TARGETS.npc.height,
      };
    case 'tile':
      return { w: DESIGN_CONFIG.TILE.SIZE, h: DESIGN_CONFIG.TILE.SIZE };
  }
  return { w: 64, h: 64 };
}

/**
 * Garante uma textura procedural com a chave pedida. Retorna a chave ou null (SSR/headless).
 */
export function ensurePhaserPlaceholderTexture(
  textures: PhaserPlaceholderTextures,
  options: PhaserPlaceholderOptions,
): string | null {
  if (typeof document === 'undefined') return null;

  const width = clampDimension(options.width, 32);
  const height = clampDimension(options.height, 32);
  const textureKey = options.textureKey;

  if (textures.exists(textureKey)) return textureKey;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawPlaceholder(ctx, { ...options, width, height });
  textures.addCanvas(textureKey, canvas);
  try {
    textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return textureKey;
}

/** Usa textura existente ou cria placeholder com a mesma chave do asset ausente. */
export function ensureTextureOrPlaceholder(
  textures: PhaserPlaceholderTextures,
  textureKey: string,
  seed: string,
  kind: PlaceholderKind,
  width?: number,
  height?: number,
  label?: string,
): string | null {
  if (textures.exists(textureKey)) return textureKey;
  const fallback = defaultPlaceholderSize(kind);
  if (label !== undefined) {
    return ensurePhaserPlaceholderTexture(textures, {
      textureKey,
      seed,
      kind,
      width: width ?? fallback.w,
      height: height ?? fallback.h,
      label,
    });
  }
  return ensurePhaserPlaceholderTexture(textures, {
    textureKey,
    seed,
    kind,
    width: width ?? fallback.w,
    height: height ?? fallback.h,
  });
}

/** Registra placeholders para chaves que falharam no preload Phaser. */
/** Chaves de atlas multi-frame — falha de load usa fallback por criatura, não placeholder único. */
const SKIP_PLACEHOLDER_TEXTURE_KEYS = new Set(['zone1-topdown-creatures']);

export function ensurePlaceholdersForFailedKeys(
  textures: PhaserPlaceholderTextures,
  failedKeys: ReadonlySet<string>,
  resolveUrl?: (textureKey: string) => string | undefined,
): number {
  let created = 0;
  for (const textureKey of failedKeys) {
    if (SKIP_PLACEHOLDER_TEXTURE_KEYS.has(textureKey)) continue;
    if (textures.exists(textureKey)) continue;
    const kind = inferPlaceholderKind(textureKey, resolveUrl?.(textureKey));
    const size = defaultPlaceholderSize(kind);
    const key = ensurePhaserPlaceholderTexture(textures, {
      textureKey,
      seed: textureKey,
      kind,
      width: size.w,
      height: size.h,
      label: abbreviateLabel(textureKey),
    });
    if (key) created += 1;
  }
  return created;
}
