import type { PlayerPositionUpdate } from '../../shared/world/protocol.js';
import type { AuthoritativePositionDelta } from '../../shared/world/movementIntent.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import {
  ONLINE_CORRECTION_TILES,
  ONLINE_HARD_SNAP_TILES,
} from '../../shared/world/playerMovementReconcile.js';
import { getMovementNetTelemetry } from './movementNetTelemetry.js';

export type AuthoritativeMoveUpdate = PlayerPositionUpdate & {
  readonly moveSeq?: number;
};

/**
 * Grace após último input/passo — cobre RTT típico sem soltar a predição cedo.
 * Enquanto WASD estiver ativo, `extendPredictionLock` renova a janela.
 *
 * Modelo online (freeze, não soft-lerp):
 * - Hold: sprite anda local; sync não puxa.
 * - Soltou: sprite CONGELA nos pés; servidor alcança em silêncio.
 * - Só hard snap (teleporte / desync absurdo) move o sprite.
 * - ZONE_ENSURE / inventário / HUD: nunca resetar prediction/freeze.
 */
export const PREDICTION_LOCK_MS = 480;

/** Âncora de cursor de tile no hold (não mexe no sprite). */
export const SOFT_TILE_ANCHOR_MS = 250;

export type PredictionLockInput = {
  readonly facing?: PlayerFacing;
  readonly x?: number;
  readonly y?: number;
};

export type PredictionResolution = {
  readonly shouldApplyToStore: boolean;
  readonly shouldPublishPlayerUpdate: boolean;
  readonly shouldApplyRenderTarget: boolean;
  readonly position: AuthoritativePositionDelta;
};

type PredictionLockState = {
  lockedUntilMs: number;
  predictedFacing: PlayerFacing | null;
  predictedX: number | null;
  predictedY: number | null;
  predictedTileX: number | null;
  predictedTileY: number | null;
};

const EMPTY_LOCK: PredictionLockState = {
  lockedUntilMs: 0,
  predictedFacing: null,
  predictedX: null,
  predictedY: null,
  predictedTileX: null,
  predictedTileY: null,
};

function silence(update: AuthoritativePositionDelta): PredictionResolution {
  return {
    shouldApplyToStore: false,
    shouldPublishPlayerUpdate: false,
    shouldApplyRenderTarget: false,
    position: update,
  };
}

function fullApply(update: AuthoritativePositionDelta): PredictionResolution {
  return {
    shouldApplyToStore: true,
    shouldPublishPlayerUpdate: true,
    shouldApplyRenderTarget: true,
    position: update,
  };
}

/**
 * Ponte SSOT — posição validada pelo servidor via state-sync tick.
 * Online = freeze nos pés ao soltar WASD (sem soft-lerp / sem “aprovar passo a passo” no sprite).
 */
class WorldMovementAuthority {
  private lastMoveSeq = 0;
  private readonly handlers = new Set<(payload: PlayerPositionUpdate) => void>();
  private online = false;
  private predictionLock: PredictionLockState = { ...EMPTY_LOCK };
  /** Tecla de movimento segurada (WASD/setas). */
  private continuousHoldActive = false;
  /** Soltou WASD: sprite congelado até soft-confirm ou hard snap. */
  private visualFrozen = false;
  private lastServerAnchor: { x: number; y: number } | null = null;
  private softAnchorDueMs = 0;

  setOnlineMode(enabled: boolean): void {
    this.online = enabled;
    if (!enabled) {
      this.lastMoveSeq = 0;
      this.continuousHoldActive = false;
      this.visualFrozen = false;
      this.lastServerAnchor = null;
      this.softAnchorDueMs = 0;
      this.clearPredictionLock();
    }
  }

  isOnline(): boolean {
    return this.online;
  }

  /**
   * Hold: anda. Soltou: não limpa freeze aqui — use `freezeVisualAt`.
   */
  setContinuousHoldActive(active: boolean): void {
    if (active) {
      this.visualFrozen = false;
      this.softAnchorDueMs = performance.now() + SOFT_TILE_ANCHOR_MS;
    }
    this.continuousHoldActive = active;
  }

  isContinuousHoldActive(): boolean {
    return this.continuousHoldActive;
  }

  isVisualFrozen(): boolean {
    return this.visualFrozen;
  }

  /**
   * Soltou WASD — congela predição nos pés visuais. Sprite não se move até hard snap.
   */
  freezeVisualAt(x: number, y: number, facing: PlayerFacing, nowMs: number = performance.now()): void {
    this.recordPredictedStep(x, y, facing, nowMs);
    this.visualFrozen = true;
    this.softAnchorDueMs = 0;
  }

  noteServerAnchor(x: number, y: number): void {
    this.lastServerAnchor = { x, y };
  }

  /**
   * Cursor de tile no hold (opcional). Nunca move sprite.
   */
  takeSoftTileAnchor(nowMs: number = performance.now()): { x: number; y: number } | null {
    if (!this.continuousHoldActive || this.visualFrozen) return null;
    if (!this.lastServerAnchor) return null;
    if (this.softAnchorDueMs <= 0 || nowMs < this.softAnchorDueMs) return null;
    const anchor = this.lastServerAnchor;
    this.softAnchorDueMs = nowMs + SOFT_TILE_ANCHOR_MS;
    return anchor;
  }

  /** Predição ativa para reconcile visual (lock, retenção, hold ou freeze). */
  isVisuallyPredicting(nowMs: number = performance.now()): boolean {
    return this.continuousHoldActive
      || this.visualFrozen
      || this.isPredictionLockActive(nowMs)
      || this.hasRetainedPrediction();
  }

  subscribe(handler: (payload: PlayerPositionUpdate) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  isPredictionLockActive(nowMs: number = performance.now()): boolean {
    return nowMs < this.predictionLock.lockedUntilMs;
  }

  /** Predição retida mesmo após o grace — evita puxar cursor de tile no heartbeat. */
  hasRetainedPrediction(): boolean {
    return this.predictionLock.predictedX !== null && this.predictionLock.predictedY !== null;
  }

  getPredictedFacing(nowMs: number = performance.now()): PlayerFacing | null {
    if (!this.isVisuallyPredicting(nowMs)) return null;
    return this.predictionLock.predictedFacing;
  }

  /** Chamado no keydown — predição imediata de direção (e posição atual). */
  lockPredictionFromInput(input: PredictionLockInput, nowMs: number = performance.now()): void {
    const tile =
      input.x !== undefined && input.y !== undefined
        ? worldPixelToTile(input.x, input.y)
        : null;

    this.predictionLock = {
      lockedUntilMs: nowMs + PREDICTION_LOCK_MS,
      predictedFacing: input.facing ?? this.predictionLock.predictedFacing,
      predictedX: input.x ?? this.predictionLock.predictedX,
      predictedY: input.y ?? this.predictionLock.predictedY,
      predictedTileX: tile?.tileX ?? this.predictionLock.predictedTileX,
      predictedTileY: tile?.tileY ?? this.predictionLock.predictedTileY,
    };
  }

  /** Renova o lock enquanto o jogador mantém teclas pressionadas. */
  extendPredictionLock(input: PredictionLockInput, nowMs: number = performance.now()): void {
    if (!this.isPredictionLockActive(nowMs) && input.facing === undefined && input.x === undefined) {
      return;
    }
    this.lockPredictionFromInput(input, nowMs);
  }

  recordPredictedStep(x: number, y: number, facing: PlayerFacing, nowMs: number = performance.now()): void {
    const tile = worldPixelToTile(x, y);
    this.predictionLock = {
      lockedUntilMs: nowMs + PREDICTION_LOCK_MS,
      predictedFacing: facing,
      predictedX: x,
      predictedY: y,
      predictedTileX: tile.tileX,
      predictedTileY: tile.tileY,
    };
  }

  clearPredictionLock(): void {
    this.predictionLock = { ...EMPTY_LOCK };
  }

  shouldDeferServerFacing(serverFacing: PlayerFacing, nowMs: number = performance.now()): boolean {
    if (!this.isVisuallyPredicting(nowMs)) return false;
    const predicted = this.predictionLock.predictedFacing;
    if (!predicted) return false;
    return serverFacing !== predicted;
  }

  shouldDeferServerPosition(serverX: number, serverY: number, nowMs: number = performance.now()): boolean {
    if (!this.hasRetainedPrediction()) return false;

    const { predictedX, predictedY } = this.predictionLock;
    if (predictedX === null || predictedY === null) return false;

    const tileSize = getActiveMapTileSize();
    const dist = Math.hypot(serverX - predictedX, serverY - predictedY);
    // Hold / freeze: qualquer sync atrás da predição é silêncio (exceto hard no resolve).
    if (this.continuousHoldActive || this.visualFrozen) {
      return dist < tileSize * ONLINE_HARD_SNAP_TILES;
    }
    return dist <= tileSize * ONLINE_CORRECTION_TILES;
  }

  /**
   * Mescla estado remoto com predição local.
   * Online freeze: hold/freeze = store-only ou silêncio; sprite só em hard snap.
   */
  resolveIncomingPosition(
    update: AuthoritativePositionDelta,
    nowMs: number = performance.now(),
  ): PredictionResolution | null {
    if (update.moveSeq !== undefined && update.moveSeq <= this.lastMoveSeq) {
      return null;
    }

    if (!this.online) {
      return fullApply(update);
    }

    const tileSize = getActiveMapTileSize();
    const hardSnapPx = tileSize * ONLINE_HARD_SNAP_TILES;
    const softConfirmPx = tileSize * 0.55;

    const predictedX = this.predictionLock.predictedX;
    const predictedY = this.predictionLock.predictedY;
    const hasPredicted = predictedX !== null && predictedY !== null;
    const isNewSeq = update.moveSeq !== undefined;
    const protectingVisual = this.continuousHoldActive || this.visualFrozen || hasPredicted;

    if (hasPredicted) {
      const dist = Math.hypot(update.x - predictedX!, update.y - predictedY!);

      if (dist >= hardSnapPx) {
        this.visualFrozen = false;
        this.clearPredictionLock();
        getMovementNetTelemetry().noteHardSnap();
        return fullApply(update);
      }

      // Servidor alcançou os pés — libera freeze; não publica sprite (já está lá).
      if (dist <= softConfirmPx) {
        this.visualFrozen = false;
        if (isNewSeq) {
          this.clearPredictionLock();
          return {
            shouldApplyToStore: true,
            shouldPublishPlayerUpdate: false,
            shouldApplyRenderTarget: false,
            position: update,
          };
        }
        this.clearPredictionLock();
        return silence(update);
      }

      // Hold / freeze / predição à frente: nunca fullApply (sem soft-lerp).
      if (protectingVisual) {
        if (isNewSeq) {
          return {
            shouldApplyToStore: true,
            shouldPublishPlayerUpdate: false,
            shouldApplyRenderTarget: false,
            position: update,
          };
        }
        return silence(update);
      }
    }

    if (!isNewSeq) {
      return silence(update);
    }

    if (this.continuousHoldActive || this.visualFrozen) {
      return {
        shouldApplyToStore: true,
        shouldPublishPlayerUpdate: false,
        shouldApplyRenderTarget: false,
        position: update,
      };
    }

    return fullApply(update);
  }

  private publishResolved(resolved: PredictionResolution): void {
    const payload: PlayerPositionUpdate = {
      x: resolved.position.x,
      y: resolved.position.y,
      facing: resolved.position.facing,
      mapId: resolved.position.mapId,
    };

    for (const handler of this.handlers) {
      handler(payload);
    }
  }

  commitAuthoritativeUpdate(
    update: AuthoritativePositionDelta,
    nowMs: number = performance.now(),
  ): PredictionResolution | null {
    if (!this.online) return null;

    const resolved = this.resolveIncomingPosition(update, nowMs);
    if (!resolved) return null;

    if (update.moveSeq !== undefined) {
      this.lastMoveSeq = update.moveSeq;
      getMovementNetTelemetry().noteMoveSeqConfirmed(update.moveSeq);
    }

    if (resolved.shouldApplyToStore) {
      this.noteServerAnchor(resolved.position.x, resolved.position.y);
    }

    if (resolved.shouldPublishPlayerUpdate) {
      this.publishResolved(resolved);
    }

    return resolved;
  }

  applyAuthoritative(update: AuthoritativePositionDelta): void {
    this.commitAuthoritativeUpdate(update);
  }

  reset(): void {
    this.lastMoveSeq = 0;
    this.online = false;
    this.continuousHoldActive = false;
    this.visualFrozen = false;
    this.lastServerAnchor = null;
    this.softAnchorDueMs = 0;
    this.clearPredictionLock();
  }
}

let authority: WorldMovementAuthority | null = null;

export function getWorldMovementAuthority(): WorldMovementAuthority {
  if (!authority) authority = new WorldMovementAuthority();
  return authority;
}

export function resetWorldMovementAuthority(): void {
  authority = null;
}

export function isAuthoritativeMovementOnline(): boolean {
  return getWorldMovementAuthority().isOnline();
}
