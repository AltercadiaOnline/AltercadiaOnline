import type { SpriteDirectionKey } from '../../../shared/world/playerFacing.js';
import {
  getIdleFrameDurationMs,
  getRunFrameDurationMs,
  getWalkFrameDurationMs,
  PLAYER_ANIMATION_CONFIG,
  resolveClipFrameCount,
} from './playerConfig.js';
import type { AnimationState, AnimatorSnapshot, PlayerSpriteCatalog, SpriteFrame } from './types.js';

function toCardinalDirection(direction: SpriteDirectionKey): SpriteDirectionKey {
  if (direction === 'north' || direction === 'south' || direction === 'east' || direction === 'west') {
    return direction;
  }
  if (direction.startsWith('north')) return 'north';
  if (direction.startsWith('south')) return 'south';
  if (direction.includes('east')) return 'east';
  return 'west';
}

function resolveRotationFrame(
  catalog: PlayerSpriteCatalog,
  direction: SpriteDirectionKey,
): readonly SpriteFrame[] {
  const rotation = catalog.rotations[direction] ?? catalog.rotations[toCardinalDirection(direction)];
  if (rotation) return [rotation];

  const firstKey = Object.keys(catalog.rotations)[0] as SpriteDirectionKey | undefined;
  const fallback = catalog.rotations.south ?? (firstKey ? catalog.rotations[firstKey] : undefined);
  return fallback ? [fallback] : [];
}

function resolveClipFrames(
  catalog: PlayerSpriteCatalog,
  state: AnimationState,
  direction: SpriteDirectionKey,
): readonly SpriteFrame[] {
  const byState = catalog.animations?.[state];
  if (!byState) return [];

  const exact = byState[direction];
  if (exact && exact.length > 0) return exact;

  const cardinal = byState[toCardinalDirection(direction)];
  if (cardinal && cardinal.length > 0) return cardinal;

  // Sem clip nesta direção → caller usa rotação estática (não misturar idle south com facing north).
  return [];
}

/**
 * Direção + estado locomotion — rotações estáticas ou clips do metadata (male_1 design).
 * Spritesheet opcional (sheet.png) mantém ciclo de frames via config.
 */
export class PlayerAnimator {
  private state: AnimationState = 'idle';
  private direction: SpriteDirectionKey = 'south';
  private frameIndex = 0;
  private accumulatorMs = 0;
  private lastTimestampMs = -1;
  private spriteSheetMode = false;

  getSnapshot(): AnimatorSnapshot {
    return {
      state: this.state,
      direction: this.direction,
      frameIndex: this.frameIndex,
    };
  }

  getDirection(): SpriteDirectionKey {
    return this.direction;
  }

  getState(): AnimationState {
    return this.state;
  }

  setDirection(direction: SpriteDirectionKey): void {
    if (this.direction === direction) return;
    this.direction = direction;
    this.resetFrameClock();
  }

  setState(state: AnimationState): void {
    if (this.state === state) return;
    this.state = state;
    this.resetFrameClock();
  }

  setLocomotionActive(moving: boolean): void {
    this.setState(moving ? 'walk' : 'idle');
  }

  applyLocomotionState(state: 'idle' | 'walk'): void {
    this.setState(state);
  }

  setCombatActive(active: boolean): void {
    this.setState(active ? 'combat' : 'idle');
  }

  /** Modo spritesheet — frameCount vem só de PLAYER_ANIMATION_CONFIG. */
  setSpriteSheetMode(enabled: boolean): void {
    this.spriteSheetMode = enabled;
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }

  advance(timestampMs: number, catalog: PlayerSpriteCatalog): void {
    const frames = this.resolveFrames(catalog);
    const playableFrames = this.resolvePlayableFrameCount(frames.length);

    if (playableFrames <= 1) {
      this.frameIndex = 0;
      this.lastTimestampMs = timestampMs;
      return;
    }

    if (this.lastTimestampMs < 0) {
      this.lastTimestampMs = timestampMs;
      return;
    }

    const deltaMs = timestampMs - this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;
    if (deltaMs <= 0) return;

    const frameDurationMs = this.resolveFrameDurationMs();
    this.accumulatorMs += deltaMs;

    while (this.accumulatorMs >= frameDurationMs) {
      this.accumulatorMs -= frameDurationMs;
      this.frameIndex = (this.frameIndex + 1) % playableFrames;
    }
  }

  resolveCurrentFrame(catalog: PlayerSpriteCatalog): SpriteFrame | null {
    const frames = this.resolveFrames(catalog);
    if (frames.length === 0) return null;
    const playableFrames = this.resolvePlayableFrameCount(frames.length);
    return frames[this.frameIndex % playableFrames] ?? null;
  }

  resolveFrames(catalog: PlayerSpriteCatalog): readonly SpriteFrame[] {
    if (this.spriteSheetMode) {
      return [{ image: { complete: true } as HTMLImageElement, src: 'spritesheet' }];
    }

    const clipFrames = resolveClipFrames(catalog, this.state, this.direction);
    if (clipFrames.length > 0) {
      return clipFrames;
    }

    return resolveRotationFrame(catalog, this.direction);
  }

  private resolvePlayableFrameCount(loadedFrameCount: number): number {
    if (this.spriteSheetMode) {
      if (this.state === 'walk' || this.state === 'run') {
        const clip = PLAYER_ANIMATION_CONFIG.walkAnimation;
        return resolveClipFrameCount(clip, loadedFrameCount);
      }
      if (this.state === 'idle') {
        const clip = PLAYER_ANIMATION_CONFIG.idleAnimation;
        return resolveClipFrameCount(clip, loadedFrameCount);
      }
      return loadedFrameCount;
    }
    return Math.max(1, loadedFrameCount);
  }

  private resolveFrameDurationMs(): number {
    if (this.state === 'walk') {
      return getWalkFrameDurationMs();
    }
    if (this.state === 'run') {
      return getRunFrameDurationMs();
    }
    if (this.state === 'idle') {
      return getIdleFrameDurationMs();
    }
    return getWalkFrameDurationMs();
  }

  private resetFrameClock(): void {
    this.frameIndex = 0;
    this.accumulatorMs = 0;
    this.lastTimestampMs = -1;
  }
}
