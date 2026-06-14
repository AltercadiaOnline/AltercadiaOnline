import type { PlayerSkin } from '../../../shared/character/playerSkin.js';
import { getSkinOption } from '../../../shared/character/playerSkin.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import {
  PLAYER_COLLISION_OFFSET,
  PLAYER_RENDER_FLOOR_OFFSET_Y,
  PLAYER_VISUAL_HEIGHT,
} from '../../../shared/world/playerEntity.js';
import { PlayerSprite } from '../../entities/player/PlayerSprite.js';

export type CharacterAvatarPreviewOptions = {
  /** Skin equipada — mesma estrutura usada no mundo top-down. */
  readonly skin: PlayerSkin;
  readonly facing?: PlayerFacing;
  /** Fundo do preview (slot de seleção vs ficha). */
  readonly backdropAlpha?: number;
  /** Fração da altura do canvas ocupada pelo sprite (ex.: 0.85 na seleção). */
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

  const scale = (h * occupancy) / PLAYER_VISUAL_HEIGHT;
  const feetY = h - (showAccent ? 10 : 6);
  const centerX = w / 2;
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
