import type { AnimationState } from './types.js';
import type { SpriteDirectionKey } from '../../../shared/world/playerFacing.js';

export type PlayerAnimationClipConfig = {
  readonly frameCount: number;
  /** Segundos por frame — ex.: 0.12 = 120 ms */
  readonly speed: number;
};

export type PlayerAnimationConfig = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly walkAnimation: PlayerAnimationClipConfig;
  readonly idleAnimation: PlayerAnimationClipConfig;
};

/**
 * Config central de animação top-down.
 * Quando o design mudar (ex.: 8 frames de walk), altere só aqui.
 */
export const PLAYER_ANIMATION_CONFIG: PlayerAnimationConfig = {
  frameWidth: 32,
  frameHeight: 32,
  walkAnimation: {
    frameCount: 6,
    speed: 0.12,
  },
  idleAnimation: {
    frameCount: 2,
    speed: 0.5,
  },
};

export function getClipFrameDurationMs(clip: PlayerAnimationClipConfig): number {
  return clip.speed * 1000;
}

/** Usa frameCount do config, limitado aos frames realmente carregados. */
export function resolveClipFrameCount(
  clip: PlayerAnimationClipConfig,
  loadedFrameCount: number,
): number {
  if (loadedFrameCount <= 0) return clip.frameCount;
  return Math.min(clip.frameCount, loadedFrameCount);
}

export function getWalkFrameDurationMs(): number {
  return getClipFrameDurationMs(PLAYER_ANIMATION_CONFIG.walkAnimation);
}

export function getIdleFrameDurationMs(): number {
  return getClipFrameDurationMs(PLAYER_ANIMATION_CONFIG.idleAnimation);
}

/** Linha no spritesheet por direção (grid 8-way). */
export const PLAYER_SHEET_DIRECTION_ROW: Record<SpriteDirectionKey, number> = {
  south: 0,
  'south-east': 1,
  east: 2,
  'north-east': 3,
  north: 4,
  'north-west': 5,
  west: 6,
  'south-west': 7,
};

export type SheetSourceRect = {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
};

export function getAnimationClipForState(state: AnimationState): PlayerAnimationClipConfig {
  if (state === 'idle') return PLAYER_ANIMATION_CONFIG.idleAnimation;
  return PLAYER_ANIMATION_CONFIG.walkAnimation;
}

export function getRunFrameDurationMs(): number {
  return getWalkFrameDurationMs() * 0.72;
}

/**
 * Recorte no spritesheet — sourceX/Y sempre derivados de PLAYER_ANIMATION_CONFIG.
 * Walk/idle: frames horizontais na linha da direção atual.
 */
export function resolveSheetSourceRect(
  frameIndex: number,
  state: AnimationState,
  direction: SpriteDirectionKey,
): SheetSourceRect {
  const { frameWidth, frameHeight } = PLAYER_ANIMATION_CONFIG;
  const clip = getAnimationClipForState(state);
  const frame = ((frameIndex % clip.frameCount) + clip.frameCount) % clip.frameCount;
  const row = PLAYER_SHEET_DIRECTION_ROW[direction];

  return {
    sx: frame * frameWidth,
    sy: row * frameHeight,
    sw: frameWidth,
    sh: frameHeight,
  };
}
