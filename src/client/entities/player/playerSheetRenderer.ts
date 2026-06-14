import type { AnimationState } from './types.js';
import type { SpriteDirectionKey } from '../../../shared/world/playerFacing.js';
import { resolveSheetSourceRect } from './playerConfig.js';
import { drawSpriteIntoEntityBounds } from './playerSpriteBoundsDraw.js';
import { resolveTrimmedPlayerSourceRect } from './playerSpriteSourceTrim.js';

export type SpriteSheetDrawTarget = {
  readonly feetX: number;
  readonly feetY: number;
  readonly assetName?: string;
};

/**
 * Desenha um frame recortado do spritesheet — 1:1, pés na base do tile.
 */
export function drawPlayerSpriteSheetFrame(
  ctx: CanvasRenderingContext2D,
  spriteSheet: HTMLImageElement,
  frameIndex: number,
  state: AnimationState,
  direction: SpriteDirectionKey,
  target: SpriteSheetDrawTarget,
): void {
  if (!spriteSheet.complete || spriteSheet.naturalWidth <= 0) return;

  const frame = resolveSheetSourceRect(frameIndex, state, direction);
  const trimmed = resolveTrimmedPlayerSourceRect(frame.sw, frame.sh);

  drawSpriteIntoEntityBounds(
    ctx,
    spriteSheet,
    {
      sx: frame.sx + trimmed.sx,
      sy: frame.sy + trimmed.sy,
      sw: trimmed.sw,
      sh: trimmed.sh,
    },
    target.feetX,
    target.feetY,
    target.assetName ?? 'player-sheet',
  );
}
