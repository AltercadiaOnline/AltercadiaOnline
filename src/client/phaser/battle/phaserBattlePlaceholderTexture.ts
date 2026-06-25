/**
 * Silhueta procedural de combatente — fallback quando ainda não há PNG do
 * sprite. Desenhada via canvas + textura Phaser (mesma técnica do pet), para o
 * protótipo nunca ficar com "buraco" visual enquanto os assets de game design
 * não chegam. Determinística por seed: a mesma criatura mantém a mesma cara.
 */
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';

type PlaceholderTextures = {
  exists: (key: string) => boolean;
  addCanvas: (key: string, canvas: HTMLCanvasElement) => unknown;
  get: (key: string) => { setFilter: (mode: number) => void };
};

const PLACEHOLDER_PREFIX = 'battle-placeholder';
const TEX_WIDTH = 96;
const TEX_HEIGHT = 120;

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

/** Aproxima a matiz de uma referência (cyan p/ aliado, vermelho p/ inimigo). */
function blendHue(base: number, target: number, factor: number): number {
  const diff = ((target - base + 540) % 360) - 180;
  return base + diff * factor;
}

function drawCreaturePlaceholder(
  ctx: CanvasRenderingContext2D,
  seed: string,
  side: 'ally' | 'foe',
): void {
  const rng = hashSeed(seed);
  const baseHue = rng % 360;
  const hue = blendHue(baseHue, side === 'foe' ? 4 : 196, 0.5);

  const body = hsl(hue, 56, 52);
  const bodyDark = hsl(hue, 52, 36);
  const bodyLight = hsl(hue, 62, 68);
  const belly = hsl(hue + 18, 48, 74);
  const outline = hsl(hue, 42, 16);

  const cx = TEX_WIDTH / 2;
  const groundY = TEX_HEIGHT - 6;

  ctx.clearRect(0, 0, TEX_WIDTH, TEX_HEIGHT);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;

  // Sombra de contato no chão.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pés.
  ctx.fillStyle = bodyDark;
  for (const footX of [cx - 13, cx + 13]) {
    ctx.beginPath();
    ctx.ellipse(footX, groundY - 4, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Corpo.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 34, 28, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Barriga clara.
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 28, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cabeça.
  const headY = groundY - 70;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, headY, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas (aliado: antenas arredondadas) / chifres (inimigo: triângulos).
  ctx.fillStyle = bodyDark;
  if (side === 'foe') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 8, headY - 18);
      ctx.lineTo(cx + dir * 20, headY - 34);
      ctx.lineTo(cx + dir * 18, headY - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + dir * 16, headY - 22, 5, 9, dir * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Brilho superior-direito.
  ctx.fillStyle = bodyLight;
  ctx.beginPath();
  ctx.ellipse(cx + 8, headY - 8, 7, 9, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Olhos.
  const eyeY = headY + 1;
  const eyeDx = 8;
  for (const dir of [-1, 1]) {
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.ellipse(cx + dir * eyeDx, eyeY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(cx + dir * eyeDx + dir * 1, eyeY + (side === 'foe' ? 1 : 0), 2.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sobrancelhas raivosas para o inimigo.
  if (side === 'foe') {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 4, eyeY - 6);
      ctx.lineTo(cx + dir * 13, eyeY - 9);
      ctx.stroke();
    }
  }
}

/**
 * Garante uma textura de silhueta para o combatente. Retorna a chave da textura
 * Phaser ou null se o ambiente não suportar canvas (SSR/teste headless).
 */
export function ensureBattlePlaceholderTexture(
  textures: PlaceholderTextures,
  seed: string,
  side: 'ally' | 'foe',
): string | null {
  if (typeof document === 'undefined') return null;

  const key = `${PLACEHOLDER_PREFIX}:${side}:${seed}`;
  if (textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = TEX_WIDTH;
  canvas.height = TEX_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawCreaturePlaceholder(ctx, seed, side);
  textures.addCanvas(key, canvas);
  try {
    textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return key;
}
