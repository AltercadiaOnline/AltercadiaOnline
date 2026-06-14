import { drawImage1To1AtFeet } from '../../render/spriteImageDraw.js';
import type { TrimmedSourceRect } from './playerSpriteSourceTrim.js';

/**
 * Desenha sprite 1:1 (dWidth = trimmed.sw) — pés na base do tile.
 * Proibido escalar para 35×54 ou outros valores fixos de contrato de colisão.
 */
export function drawSpriteIntoEntityBounds(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  trimmed: TrimmedSourceRect,
  feetX: number,
  feetY: number,
  assetName = 'player',
): void {
  drawImage1To1AtFeet(ctx, image, trimmed, feetX, feetY, assetName);
}
