export type OpaqueSpriteBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const boundsCache = new Map<string, OpaqueSpriteBounds | null>();
const ALPHA_CUTOFF = 16;

/**
 * Offset para centrar a arte opaca no slot com object-fit: contain.
 * Não altera escala — só translate.
 */
export function computeOpaqueContentOffset(
  bounds: OpaqueSpriteBounds,
  naturalWidth: number,
  naturalHeight: number,
  displayWidth: number,
  displayHeight: number,
): { readonly x: number; readonly y: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    return { x: 0, y: 0 };
  }

  const scale = Math.min(displayWidth / naturalWidth, displayHeight / naturalHeight);
  const destWidth = naturalWidth * scale;
  const destHeight = naturalHeight * scale;
  const destX = (displayWidth - destWidth) / 2;
  const destY = (displayHeight - destHeight) / 2;

  const opaqueCenterX = destX + (bounds.x + bounds.width / 2) * scale;
  const opaqueCenterY = destY + (bounds.y + bounds.height / 2) * scale;

  const x = displayWidth / 2 - opaqueCenterX;
  const y = displayHeight / 2 - opaqueCenterY;
  return {
    x: Math.abs(x) < 0.5 ? 0 : x,
    y: Math.abs(y) < 0.5 ? 0 : y,
  };
}

function scanOpaqueBounds(image: CanvasImageSource, width: number, height: number): OpaqueSpriteBounds | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3]! <= ALPHA_CUTOFF) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return null;
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  } catch {
    return null;
  }
}

export function measureHtmlImageOpaqueBounds(image: HTMLImageElement): OpaqueSpriteBounds | null {
  const cacheKey = image.currentSrc || image.src;
  if (cacheKey && boundsCache.has(cacheKey)) {
    return boundsCache.get(cacheKey) ?? null;
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width < 1 || height < 1) return null;

  const bounds = scanOpaqueBounds(image, width, height);
  if (cacheKey) boundsCache.set(cacheKey, bounds);
  return bounds;
}

export function resolveOpaqueCenterTransform(
  image: HTMLImageElement,
): { readonly x: number; readonly y: number } | null {
  const bounds = measureHtmlImageOpaqueBounds(image);
  if (!bounds) return null;
  return computeOpaqueContentOffset(
    bounds,
    image.naturalWidth,
    image.naturalHeight,
    image.clientWidth,
    image.clientHeight,
  );
}
