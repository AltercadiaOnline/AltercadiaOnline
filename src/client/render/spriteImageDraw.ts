import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import { snapDrawImageDest } from './pixelSnap.js';
import type { TrimmedSourceRect } from '../entities/player/playerSpriteSourceTrim.js';

/** Auditoria de dimensões 1:1 — ative só para debug local. */
export const DEBUG_ASSET_DIMENSIONS = false;

export function readImageNaturalSize(image: CanvasImageSource): {
  readonly width: number;
  readonly height: number;
} {
  const img = image as HTMLImageElement;
  if ('naturalWidth' in img && img.naturalWidth > 0) {
    return { width: img.naturalWidth, height: img.naturalHeight };
  }
  if ('width' in img && typeof img.width === 'number' && img.width > 0) {
    return { width: img.width, height: img.height as number };
  }
  return { width: 0, height: 0 };
}

export function logAssetDrawDimensions(
  assetName: string,
  image: CanvasImageSource,
  trimmed: TrimmedSourceRect,
  dWidth: number,
  dHeight: number,
): void {
  if (!DEBUG_ASSET_DIMENSIONS) return;
  const natural = readImageNaturalSize(image);
  console.log(
    `Asset: ${assetName} - Tamanho Real: ${natural.width}x${natural.height} - Tamanho Desenho: ${dWidth}x${dHeight}`,
  );
}

/**
 * drawImage 1:1 — dWidth/dHeight = trimmed.sw/sh (sem escala para 35, 40 ou 54).
 * Âncora: base central (pés em feetX, feetY).
 */
export function drawImage1To1AtFeet(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  trimmed: TrimmedSourceRect,
  feetX: number,
  feetY: number,
  assetName: string,
): void {
  if (trimmed.sw <= 0 || trimmed.sh <= 0) return;

  const dWidth = trimmed.sw;
  const dHeight = trimmed.sh;
  const { dx, dy, dWidth: dw, dHeight: dh } = snapDrawImageDest(
    feetX - dWidth / 2,
    feetY - dHeight,
    dWidth,
    dHeight,
  );

  logAssetDrawDimensions(assetName, image, trimmed, dw, dh);

  disableCanvasImageSmoothing(ctx);
  ctx.drawImage(
    image,
    trimmed.sx,
    trimmed.sy,
    trimmed.sw,
    trimmed.sh,
    dx,
    dy,
    dw,
    dh,
  );
}

/** 1:1 ancorado no canto superior-esquerdo (estruturas multi-tile). */
export function drawImage1To1AtTopLeft(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  trimmed: TrimmedSourceRect,
  x: number,
  y: number,
  assetName: string,
): void {
  if (trimmed.sw <= 0 || trimmed.sh <= 0) return;

  const dWidth = trimmed.sw;
  const dHeight = trimmed.sh;
  const { dx, dy, dWidth: dw, dHeight: dh } = snapDrawImageDest(x, y, dWidth, dHeight);

  logAssetDrawDimensions(assetName, image, trimmed, dw, dh);

  disableCanvasImageSmoothing(ctx);
  ctx.drawImage(
    image,
    trimmed.sx,
    trimmed.sy,
    trimmed.sw,
    trimmed.sh,
    dx,
    dy,
    dw,
    dh,
  );
}
