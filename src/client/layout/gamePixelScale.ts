import {
  GAME_RENDER_HEIGHT,
  GAME_RENDER_WIDTH,
} from './gameLayout.js';

type CanvasContextWithVendorSmoothing = CanvasRenderingContext2D & {
  mozImageSmoothingEnabled?: boolean;
  webkitImageSmoothingEnabled?: boolean;
  msImageSmoothingEnabled?: boolean;
};

/** Sempre 1 — buffer fixo 640×360; escala só no CSS (transform: scale). */
export function getGamePixelScale(): number {
  return 1;
}

export function setGamePixelScale(_scale: number): void {
  /* no-op — contrato fixo 640×360 */
}

/**
 * Canvas fixo 640×360 — sem upscale no backing store.
 * @deprecated Use configureFixedGameCanvas
 */
export function configureGameCanvasBackingStore(canvas: HTMLCanvasElement, _pixelScale?: number): void {
  configureFixedGameCanvas(canvas);
}

/** Garante buffer e CSS 640×360 px. */
export function configureFixedGameCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = GAME_RENDER_WIDTH;
  canvas.height = GAME_RENDER_HEIGHT;
  canvas.style.width = `${GAME_RENDER_WIDTH}px`;
  canvas.style.height = `${GAME_RENDER_HEIGHT}px`;
}

/**
 * Cria contexto 2D com suavização desligada antes de qualquer draw.
 */
export function createGameCanvas2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('[gamePixelScale] Contexto 2D indisponível.');
  }
  disableCanvasImageSmoothing(ctx);
  return ctx;
}

/**
 * Desativa toda suavização do contexto 2D — obrigatório antes de desenhar pixel art.
 */
export function disableCanvasImageSmoothing(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false;

  const extended = ctx as CanvasContextWithVendorSmoothing;
  if ('mozImageSmoothingEnabled' in extended) {
    extended.mozImageSmoothingEnabled = false;
  }
  if ('webkitImageSmoothingEnabled' in extended) {
    extended.webkitImageSmoothingEnabled = false;
  }
  if ('msImageSmoothingEnabled' in extended) {
    extended.msImageSmoothingEnabled = false;
  }
  if ('imageSmoothingQuality' in ctx) {
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }).imageSmoothingQuality = 'low';
  }
}

/** Arredonda coordenada de desenho — evita subpixels que geram blur no drawImage. */
export function snapPixel(value: number): number {
  return Math.round(value);
}

/** Destino inteiro para ctx.drawImage (dx, dy, dWidth, dHeight). */
export function snapDrawImageDest(
  x: number,
  y: number,
  width: number,
  height: number,
): { readonly dx: number; readonly dy: number; readonly dWidth: number; readonly dHeight: number } {
  return {
    dx: snapPixel(x),
    dy: snapPixel(y),
    dWidth: snapPixel(width),
    dHeight: snapPixel(height),
  };
}

/** @deprecated Buffer fixo — transform identidade. */
export function applyLogicalPixelTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  disableCanvasImageSmoothing(ctx);
}

export function getLogicalViewportSize(): { readonly width: number; readonly height: number } {
  return {
    width: GAME_RENDER_WIDTH,
    height: GAME_RENDER_HEIGHT,
  };
}
