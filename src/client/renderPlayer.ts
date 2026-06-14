import {
  getSharedPlayerSprite,
  type PlayerRenderSnapshot,
} from './entities/player/index.js';
import type { Player } from './entities/Player.js';
import type { PlayerAnimationSnapshot } from '../shared/world/playerAnimationState.js';
export { getPlayerNametagAnchor, resolvePlayerNametagView } from './world/nametagRenderer.js';

export {
  PLAYER_RENDER_SCALE,
  PLAYER_RENDER_SIZE,
  PLAYER_VISUAL_HEIGHT,
  PLAYER_VISUAL_WIDTH,
  PLAYER_COLLISION_OFFSET,
  getPlayerCollisionPoint,
  getPlayerDepthY,
  getPlayerVisualBounds,
  getPlayerVisualCenter,
} from '../shared/world/playerEntity.js';

export type PlayerRenderState = PlayerRenderSnapshot;

/** Snapshot de animação para o RenderEngine — IDLE/WALK + direção cardinal. */
export function resolvePlayerAnimationState(player: Player): PlayerAnimationSnapshot {
  return player.getAnimationState();
}

/** Desenha em coordenadas do mundo — a câmera aplica zoom e pan. */
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerRenderSnapshot,
  timestampMs?: number,
): void {
  const avatar = getSharedPlayerSprite();
  const frameMs = timestampMs ?? performance.now();
  avatar.update(frameMs);
  avatar.draw(ctx, player, frameMs);
}

/** Pré-carrega metadata + sprites do bundle teenage. */
export function preloadPlayerSprites(): Promise<void> {
  return getSharedPlayerSprite().ready();
}
