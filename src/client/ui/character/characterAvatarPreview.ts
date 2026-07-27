import type { PlayerSkin } from '../../../shared/character/playerSkin.js';
import { getSkinOption } from '../../../shared/character/playerSkin.js';
import {
  resolvePlayerSkinBundleSouthPreviewCandidates,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import {
  PLAYER_COLLISION_OFFSET,
  PLAYER_RENDER_FLOOR_OFFSET_Y,
} from '../../../shared/world/playerEntity.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { PlayerSprite } from '../../entities/player/PlayerSprite.js';

export type CharacterAvatarPreviewOptions = {
  /** Skin equipada — mesma estrutura usada no mundo top-down. */
  readonly skin: PlayerSkin;
  readonly facing?: PlayerFacing;
  /** Fundo do preview (slot de seleção vs ficha). */
  readonly backdropAlpha?: number;
  /** Fração da altura do canvas ocupada pelo sprite (ex.: 0.8 na ficha). */
  readonly visualOccupancy?: number;
  /** Exibe faixa de cores da skin na base do canvas. */
  readonly showSkinAccentStrip?: boolean;
};

const DEFAULT_FACING: PlayerFacing = 'south';

/**
 * Pinta avatar idle top-down em um canvas.
 * Use uma instância de `PlayerSprite` por preview simultâneo (ex.: slots da seleção).
 */
export async function paintCharacterAvatarPreview(
  canvas: HTMLCanvasElement,
  options: CharacterAvatarPreviewOptions,
  player: PlayerSprite,
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const alpha = options.backdropAlpha ?? 0.35;
  const facing = options.facing ?? DEFAULT_FACING;
  const occupancy = options.visualOccupancy ?? 0.58;
  const showAccent = options.showSkinAccentStrip ?? true;
  const accentPad = showAccent ? 10 : 6;

  const clearFrame = (): void => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    if (showAccent) paintSkinAccentStrip(ctx, w, h, options.skin);
  };

  clearFrame();

  player.setSkin(options.skin);
  player.setFacing(facing);
  player.setMoving(false);
  player.update(performance.now());

  await player.ready();

  clearFrame();

  // Sprite desenha 1:1 — escala pelo frame nativo, não pela altura lógica de mundo (124).
  const native = player.getNativeDrawSize();
  const usableH = Math.max(1, h - accentPad);
  const usableW = Math.max(1, w * 0.92);
  const scale = Math.min(
    (usableH * occupancy) / native.height,
    usableW / native.width,
  );
  const feetY = h - accentPad;
  const centerX = w / 2;
  // draw() ancora pés via getPlayerFeetWorldY — compensar offset de mundo.
  const logicalY = feetY - (PLAYER_RENDER_FLOOR_OFFSET_Y + PLAYER_COLLISION_OFFSET.y);

  ctx.save();
  ctx.translate(centerX, feetY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -feetY);
  player.draw(ctx, {
    x: centerX,
    y: logicalY,
    facing,
    skin: options.skin,
  });
  ctx.restore();
}

function loadPreviewImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Preview image failed: ${url}`));
    img.src = url;
  });
}

/** Tenta candidatas em ordem; null se todas falharem (UI segue sem throw). */
async function loadPreviewImageFromCandidates(
  urls: readonly string[],
): Promise<HTMLImageElement | null> {
  for (const url of urls) {
    try {
      return await loadPreviewImage(url);
    } catch {
      // próxima candidata
    }
  }
  console.warn('[AvatarPreview] Nenhuma URL de preview carregou:', urls.join(' → '));
  return null;
}

/**
 * Preview estático do bundle top-down — mesma URL do modal de criação (`<img>`).
 * Usado na seleção de personagem para espelhar a aparência escolhida na criação.
 */
export async function paintCharacterBundleSouthPreview(
  canvas: HTMLCanvasElement,
  bundleId: PlayerSkinBundleId,
  options: CharacterAvatarPreviewOptions,
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const alpha = options.backdropAlpha ?? 0.35;
  const occupancy = options.visualOccupancy ?? 0.58;
  const showAccent = options.showSkinAccentStrip ?? true;

  const clearFrame = (): void => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    if (showAccent) paintSkinAccentStrip(ctx, w, h, options.skin);
  };

  clearFrame();
  disableCanvasImageSmoothing(ctx);

  const image = await loadPreviewImageFromCandidates(
    resolvePlayerSkinBundleSouthPreviewCandidates(bundleId),
  );
  if (!image) {
    // Soft-fail: slot continua utilizável (sem uncaught Preview image failed).
    return;
  }
  clearFrame();

  // Recorta a margem transparente para normalizar o tamanho VISÍVEL do sprite entre
  // bundles — cada PNG tem uma moldura diferente (35×54 justo vs. 96/112/128 com folga).
  const crop = computeOpaqueBounds(image) ?? {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };

  const bottomPad = showAccent ? 10 : 6;
  const maxDrawHeight = Math.max(1, h - bottomPad) * occupancy;
  const maxDrawWidth = w * 0.92;
  const scale = Math.min(maxDrawHeight / crop.height, maxDrawWidth / crop.width);
  const drawW = crop.width * scale;
  const drawH = crop.height * scale;
  const drawX = (w - drawW) / 2;
  const drawY = h - bottomPad - drawH;

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, drawX, drawY, drawW, drawH);
}

type OpaqueBounds = { x: number; y: number; width: number; height: number };

/**
 * Bounding box dos pixels não transparentes de um sprite.
 * Same-origin (/assets) → getImageData é seguro; em falha retorna null (usa PNG inteiro).
 */
function computeOpaqueBounds(image: HTMLImageElement): OpaqueBounds | null {
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  if (nw <= 0 || nh <= 0) return null;

  const off = document.createElement('canvas');
  off.width = nw;
  off.height = nh;
  const octx = off.getContext('2d', { willReadFrequently: true });
  if (!octx) return null;
  octx.drawImage(image, 0, 0);

  let pixels: Uint8ClampedArray;
  try {
    pixels = octx.getImageData(0, 0, nw, nh).data;
  } catch {
    return null;
  }

  const alphaThreshold = 8;
  let minX = nw;
  let minY = nh;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      const alphaValue = pixels[(y * nw + x) * 4 + 3] ?? 0;
      if (alphaValue > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function paintSkinAccentStrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skin: PlayerSkin,
): void {
  const slots = ['hair', 'shirt', 'pants', 'shoes'] as const;
  const stripH = 6;
  const segmentW = width / slots.length;

  slots.forEach((slot, index) => {
    const option = getSkinOption(slot, skin[slot]);
    ctx.fillStyle = option?.accent ?? '#333';
    ctx.fillRect(index * segmentW, height - stripH, segmentW, stripH);
  });
}
