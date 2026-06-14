import type { PlayerPositionUpdate } from '../../shared/world/protocol.js';

import type { AuthoritativePositionDelta } from '../../shared/world/movementIntent.js';

import type { PlayerFacing } from '../../shared/world/playerFacing.js';

import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';

import { worldPixelToTile } from '../../shared/world/portals.js';



export type AuthoritativeMoveUpdate = PlayerPositionUpdate & {

  readonly moveSeq?: number;

};



/** Ignora facing/posição remota por este período após input local. */

export const PREDICTION_LOCK_MS = 100;



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



/**

 * Ponte SSOT — posição validada pelo servidor via state-sync tick.

 * Com prediction lock: input local tem prioridade sobre estado remoto.

 */

class WorldMovementAuthority {

  private lastMoveSeq = 0;

  private readonly handlers = new Set<(payload: PlayerPositionUpdate) => void>();

  private online = false;

  private predictionLock: PredictionLockState = { ...EMPTY_LOCK };



  setOnlineMode(enabled: boolean): void {

    this.online = enabled;

    if (!enabled) {

      this.lastMoveSeq = 0;

      this.clearPredictionLock();

    }

  }



  isOnline(): boolean {

    return this.online;

  }



  subscribe(handler: (payload: PlayerPositionUpdate) => void): () => void {

    this.handlers.add(handler);

    return () => this.handlers.delete(handler);

  }



  isPredictionLockActive(nowMs: number = performance.now()): boolean {

    return nowMs < this.predictionLock.lockedUntilMs;

  }



  getPredictedFacing(nowMs: number = performance.now()): PlayerFacing | null {

    if (!this.isPredictionLockActive(nowMs)) return null;

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

    if (!this.isPredictionLockActive(nowMs)) return false;

    const predicted = this.predictionLock.predictedFacing;

    if (!predicted) return false;

    return serverFacing !== predicted;

  }



  shouldDeferServerPosition(serverX: number, serverY: number, nowMs: number = performance.now()): boolean {

    if (!this.isPredictionLockActive(nowMs)) return false;

    const { predictedX, predictedY } = this.predictionLock;

    if (predictedX === null || predictedY === null) return false;



    const tileSize = getActiveMapTileSize();

    const dist = Math.hypot(serverX - predictedX, serverY - predictedY);

    return dist > tileSize * 0.55;

  }



  private tryConfirmPrediction(

    update: AuthoritativePositionDelta,

    nowMs: number = performance.now(),

  ): boolean {

    if (!this.isPredictionLockActive(nowMs)) return false;



    const { predictedX, predictedY, predictedFacing } = this.predictionLock;

    if (predictedX === null || predictedY === null) return false;

    const tileSize = getActiveMapTileSize();
    const dist = Math.hypot(update.x - predictedX, update.y - predictedY);
    if (dist > tileSize * 0.55) return false;

    if (predictedFacing && update.facing !== predictedFacing) return false;

    this.clearPredictionLock();
    return true;

  }



  /**

   * Mescla estado remoto com predição local — input local tem prioridade

   * enquanto o lock estiver ativo e o servidor não confirmou o passo.

   */

  resolveIncomingPosition(

    update: AuthoritativePositionDelta,

    nowMs: number = performance.now(),

  ): PredictionResolution | null {

    if (update.moveSeq !== undefined && update.moveSeq <= this.lastMoveSeq) {

      return null;

    }



    if (!this.online) {

      return {

        shouldApplyToStore: true,

        shouldPublishPlayerUpdate: true,

        shouldApplyRenderTarget: true,

        position: update,

      };

    }



    if (this.tryConfirmPrediction(update, nowMs)) {

      return {

        shouldApplyToStore: true,

        shouldPublishPlayerUpdate: true,

        shouldApplyRenderTarget: true,

        position: update,

      };

    }



    const lockActive = this.isPredictionLockActive(nowMs);

    if (!lockActive) {

      return {

        shouldApplyToStore: true,

        shouldPublishPlayerUpdate: true,

        shouldApplyRenderTarget: true,

        position: update,

      };

    }



    const deferFacing = this.shouldDeferServerFacing(update.facing, nowMs);

    const deferPosition = this.shouldDeferServerPosition(update.x, update.y, nowMs);



    if (deferPosition && deferFacing) {

      return {

        shouldApplyToStore: false,

        shouldPublishPlayerUpdate: false,

        shouldApplyRenderTarget: false,

        position: update,

      };

    }



    const predictedFacing = this.predictionLock.predictedFacing ?? update.facing;

    const predictedX = this.predictionLock.predictedX ?? update.x;

    const predictedY = this.predictionLock.predictedY ?? update.y;



    const merged: AuthoritativePositionDelta = {

      ...update,

      facing: deferFacing ? predictedFacing : update.facing,

      x: deferPosition ? predictedX : update.x,

      y: deferPosition ? predictedY : update.y,

    };



    return {

      shouldApplyToStore: !deferPosition,

      shouldPublishPlayerUpdate: !deferPosition && !deferFacing,

      shouldApplyRenderTarget: !deferPosition,

      position: merged,

    };

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


