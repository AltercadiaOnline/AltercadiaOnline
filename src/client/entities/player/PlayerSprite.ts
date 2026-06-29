import { resolvePlayerVisualBounds } from '../../../shared/world/playerVisualContract.js';
import type { WorldPoint } from '../../../shared/world/playerEntity.js';
import type { PlayerSkin } from '../../../shared/character/playerSkin.js';
import {
  facingToSpriteDirection,
  moveDirectionToFacing,
  moveVectorToSpriteDirection,
  type PlayerFacing,
} from '../../../shared/world/playerFacing.js';
import type { MoveDirection } from '../../../shared/world/protocol.js';
import type { PlayerAnimationSnapshot, PlayerAnimState } from '../../../shared/world/playerAnimationState.js';
import { animDirectionToFacing } from '../../../shared/world/playerAnimationState.js';
import { PlayerAnimator } from './PlayerAnimator.js';
import { PlayerLayerRenderer } from './PlayerLayerRenderer.js';
import { drawPlayerSpriteSheetFrame } from './playerSheetRenderer.js';
import { drawSpriteIntoEntityBounds } from './playerSpriteBoundsDraw.js';
import { resolveTrimmedPlayerSourceRect } from './playerSpriteSourceTrim.js';
import { PlayerSpriteLoader } from './PlayerSpriteLoader.js';
import { USE_LAYER_COMPOSITOR } from './playerConstants.js';
import type { PlayerSkinBundleId } from '../../../shared/character/playerSkinBundle.js';
import { getActivePlayerSkinBundleId } from './activePlayerSkinBundle.js';
import { snapToPixel } from '../../render/pixelSnap.js';
import { IdleBreathingAnimation } from './idleBreathingAnimation.js';
import type { PlayerSpriteCatalog, AnimatorSnapshot } from './types.js';

export type PlayerRenderSnapshot = WorldPoint & {
  readonly facing?: PlayerFacing;
  readonly name?: string;
  readonly level?: number;
  readonly skin?: PlayerSkin;
  /** Nível Z local na torre (0–3). */
  readonly heightLevel?: number;
};

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  drawX: number,
  drawY: number,
  width: number,
  height: number,
): void {
  const radius = Math.min(width, height) * 0.12;
  ctx.fillStyle = '#d4b483';
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, width, height, radius);
  ctx.fill();
  ctx.strokeStyle = '#5e4a30';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Renderizador top-down — spritesheet (config-driven) ou PNGs do metadata teenage.
 */
export class PlayerSprite {
  private catalog: PlayerSpriteCatalog | null = null;
  private spriteSheet: HTMLImageElement | null = null;
  private readonly loadPromise: Promise<void>;
  private readonly animator = new PlayerAnimator();
  private readonly layerRenderer = new PlayerLayerRenderer();
  private readonly idleBreathing = new IdleBreathingAnimation();
  private appliedSkinKey: string | null = null;
  private lastRenderTimestampMs = 0;

  constructor(skinBundleId: PlayerSkinBundleId = getActivePlayerSkinBundleId()) {
    this.loadPromise = Promise.all([
      PlayerSpriteLoader.getTopDownCatalog(skinBundleId).then((catalog) => {
        this.catalog = catalog;
      }),
      PlayerSpriteLoader.loadTopDownSpriteSheet(skinBundleId).then((sheet) => {
        this.spriteSheet = sheet;
        this.animator.setSpriteSheetMode(sheet !== null);
      }),
    ]).then(() => undefined);

    if (USE_LAYER_COMPOSITOR) {
      this.loadPromise = this.loadPromise.then(() => this.layerRenderer.preload()).then(() => undefined);
    }
  }

  ready(): Promise<void> {
    return this.loadPromise;
  }

  setSkin(skin: PlayerSkin): void {
    if (!USE_LAYER_COMPOSITOR) return;
    this.layerRenderer.setSkin(skin);
  }

  setGear(gearId: string): void {
    if (!USE_LAYER_COMPOSITOR) return;
    this.layerRenderer.setGear(gearId);
  }

  setFacing(facing: PlayerFacing): void {
    this.animator.setDirection(facingToSpriteDirection(facing));
  }

  setFacingFromDirection(direction: MoveDirection): void {
    this.setFacing(moveDirectionToFacing(direction));
  }

  setFacingFromVector(dx: number, dy: number): void {
    this.animator.setDirection(moveVectorToSpriteDirection(dx, dy));
  }

  setMoving(moving: boolean): void {
    this.animator.setLocomotionActive(moving);
  }

  /** Aplica snapshot IDLE/WALK/RUN + direção cardinal na máquina de animação. */
  applyAnimationSnapshot(snapshot: PlayerAnimationSnapshot): void {
    this.setFacing(animDirectionToFacing(snapshot.direction));
    this.animator.applyLocomotionState(mapAnimStateToClip(snapshot.state));
  }

  setCombatMode(active: boolean): void {
    this.animator.setCombatActive(active);
  }

  syncFromSnapshot(snapshot: PlayerRenderSnapshot): void {
    if (snapshot.facing && this.animator.getState() === 'idle') {
      this.setFacing(snapshot.facing);
    }
    this.applySkin(snapshot.skin);
  }

  private applySkin(skin: PlayerSkin | undefined): void {
    if (!USE_LAYER_COMPOSITOR || !skin) return;
    const key = `${skin.hair}|${skin.shirt}|${skin.pants}|${skin.shoes}`;
    if (key === this.appliedSkinKey) return;
    this.appliedSkinKey = key;
    this.layerRenderer.setSkin(skin);
  }

  getAnimationSnapshot(): AnimatorSnapshot {
    return this.animator.getSnapshot();
  }

  update(timestampMs: number = performance.now()): void {
    this.lastRenderTimestampMs = timestampMs;
    this.idleBreathing.update({
      isIdle: this.animator.getState() === 'idle',
      timestampMs,
    });

    if (this.spriteSheet) {
      this.animator.advance(timestampMs, this.catalog ?? emptyCatalog());
      return;
    }
    if (!this.catalog) return;
    this.animator.advance(timestampMs, this.catalog);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    position: PlayerRenderSnapshot,
    timestampMs?: number,
  ): void {
    const frameMs = timestampMs ?? this.lastRenderTimestampMs;
    if (position.facing) {
      this.setFacing(position.facing);
    }

    const collisionBounds = resolvePlayerVisualBounds(position);
    const feetX = snapToPixel(collisionBounds.x + collisionBounds.width / 2);
    const feetY = snapToPixel(collisionBounds.y + collisionBounds.height);
    const breath = this.idleBreathing.sample(frameMs);

    ctx.save();
    this.idleBreathing.applyTransform(
      ctx,
      collisionBounds.x,
      collisionBounds.y,
      collisionBounds.width,
      collisionBounds.height,
      breath,
    );

    if (USE_LAYER_COMPOSITOR && this.layerRenderer.hasLayers()) {
      this.layerRenderer.renderPlayer(ctx, { feetX, feetY });
      ctx.restore();
      return;
    }

    if (this.spriteSheet) {
      this.renderSpriteSheet(ctx, feetX, feetY);
      ctx.restore();
      return;
    }

    this.drawTopDownBundle(ctx, feetX, feetY);
    ctx.restore();
  }

  /** Recorte horizontal por frameIndex — dimensões de PLAYER_ANIMATION_CONFIG. */
  private renderSpriteSheet(
    ctx: CanvasRenderingContext2D,
    feetX: number,
    feetY: number,
  ): void {
    if (!this.spriteSheet) {
      const bounds = { x: feetX - 17, y: feetY - 54, width: 35, height: 54 };
      drawPlaceholder(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
      return;
    }

    const snapshot = this.animator.getSnapshot();
    drawPlayerSpriteSheetFrame(
      ctx,
      this.spriteSheet,
      snapshot.frameIndex,
      snapshot.state,
      snapshot.direction,
      { feetX, feetY, assetName: 'player-sheet' },
    );
  }

  private drawTopDownBundle(
    ctx: CanvasRenderingContext2D,
    feetX: number,
    feetY: number,
  ): void {
    if (!this.catalog) {
      const bounds = { x: feetX - 17, y: feetY - 54, width: 35, height: 54 };
      drawPlaceholder(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
      return;
    }

    const frame = this.animator.resolveCurrentFrame(this.catalog);
    if (!frame) {
      const bounds = { x: feetX - 17, y: feetY - 54, width: 35, height: 54 };
      drawPlaceholder(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
      return;
    }

    const { image } = frame;
    if (!image.complete || image.naturalWidth <= 0) {
      const bounds = { x: feetX - 17, y: feetY - 54, width: 35, height: 54 };
      drawPlaceholder(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
      return;
    }

    const trimmed = resolveTrimmedPlayerSourceRect(
      this.catalog.frameWidth,
      this.catalog.frameHeight,
    );

    drawSpriteIntoEntityBounds(ctx, image, trimmed, feetX, feetY, 'player-rotation');
  }
}

function emptyCatalog(): PlayerSpriteCatalog {
  return {
    frameWidth: 0,
    frameHeight: 0,
    rotations: {},
  };
}

let sharedPlayerSprite: PlayerSprite | null = null;

export function getSharedPlayerSprite(): PlayerSprite {
  if (!sharedPlayerSprite) {
    sharedPlayerSprite = new PlayerSprite();
  }
  return sharedPlayerSprite;
}

export function resetSharedPlayerSprite(): void {
  sharedPlayerSprite = null;
}

/** @deprecated Use getSharedPlayerSprite */
export const getSharedPlayer = getSharedPlayerSprite;

/** @deprecated Use resetSharedPlayerSprite */
export const resetSharedPlayer = resetSharedPlayerSprite;

/** @deprecated Use PlayerSprite */
export { PlayerSprite as Player };

function mapAnimStateToClip(state: PlayerAnimState): 'idle' | 'walk' {
  return state === 'IDLE' ? 'idle' : 'walk';
}
