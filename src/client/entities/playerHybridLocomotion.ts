import { resolveMoveSpeedPxPerSec } from '../../shared/character/playerStatsBonus.js';
import {
  PATH_WAYPOINT_ARRIVAL_PX,
} from '../../shared/world/pathQueue.js';
import {
  tryGridStep,
  type GridStep,
} from '../../shared/world/gridMovement.js';
import type { CardinalInput } from '../../shared/world/movementInput.js';
import { composeMoveVector, normalizeWorldVector } from '../../shared/world/movementInput.js';
import {
  moveVectorToFacing,
  type PlayerFacing,
} from '../../shared/world/playerFacing.js';
import {
  clampFrameDeltaMs,
  moveByDelta,
  resolvePlayerMoveSpeedPxPerSec,
  type WorldPosition,
} from '../../shared/world/movement.js';
import { SnapMovementEngine } from '../../shared/world/snapMovementEngine.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
import { isAuthoritativeMovementOnline } from '../world/worldMovementAuthority.js';

export type MovementMode = 'MANUAL' | 'AUTO';

export type HybridLocomotionTickConfig = {
  readonly speedBonusTotal: number;
  readonly isEncumbered: boolean;
};

export type HybridLocomotionSnapshot = {
  readonly movementMode: MovementMode;
  readonly pathQueueLength: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly displayX: number;
  readonly displayY: number;
  readonly facing: PlayerFacing;
};

/**
 * Locomoção híbrida estilo MMO clássico:
 * - MANUAL: teclado com aceleração snap (vetorial float)
 * - AUTO: path-follower com velocidade constante (sem aceleração)
 */
export class PlayerHybridLocomotion {
  movementMode: MovementMode = 'MANUAL';
  pathQueue: WorldPosition[] = [];

  displayX = 0;
  displayY = 0;
  facing: PlayerFacing = 'south';

  /** Tile lógico para sync de rede — não força snap visual. */
  tileX = 0;
  tileY = 0;

  private readonly snapEngine = new SnapMovementEngine();
  private autoWalkVelocity: WorldPosition = { x: 0, y: 0 };

  /** Correção elástica online — evita snap seco em drift moderado. */
  private softCorrectTarget: WorldPosition | null = null;
  private softCorrectRemainingMs = 0;

  constructor(worldX: number, worldY: number, facing: PlayerFacing = 'south') {
    this.setWorldPosition(worldX, worldY, facing);
  }

  private static readonly SOFT_CORRECT_MS = 80;

  get isMoving(): boolean {
    if (this.movementMode === 'AUTO') {
      return this.pathQueue.length > 0 || Math.hypot(this.autoWalkVelocity.x, this.autoWalkVelocity.y) > 0;
    }
    return this.snapEngine.isMoving();
  }

  get hasManualVelocity(): boolean {
    return this.snapEngine.isMoving();
  }

  getVelocity(): WorldPosition {
    if (this.movementMode === 'AUTO' && this.pathQueue.length > 0) {
      return { ...this.autoWalkVelocity };
    }
    return this.snapEngine.getVelocity();
  }

  snapshot(): HybridLocomotionSnapshot {
    return {
      movementMode: this.movementMode,
      pathQueueLength: this.pathQueue.length,
      tileX: this.tileX,
      tileY: this.tileY,
      displayX: this.displayX,
      displayY: this.displayY,
      facing: this.facing,
    };
  }

  setPathQueue(queue: readonly WorldPosition[]): void {
    this.pathQueue = queue.map((point) => ({ x: point.x, y: point.y }));
    this.movementMode = this.pathQueue.length > 0 ? 'AUTO' : 'MANUAL';
    this.snapEngine.reset();
    this.autoWalkVelocity = { x: 0, y: 0 };
  }

  clearPathQueue(): void {
    this.pathQueue = [];
    this.movementMode = 'MANUAL';
    this.autoWalkVelocity = { x: 0, y: 0 };
  }

  stop(): void {
    this.snapEngine.reset();
    this.clearPathQueue();
  }

  enterManualFromKeyboard(): void {
    if (this.movementMode !== 'AUTO') return;
    this.pathQueue = [];
    this.movementMode = 'MANUAL';
    this.autoWalkVelocity = { x: 0, y: 0 };
    this.snapEngine.reset();
  }

  setWorldPosition(worldX: number, worldY: number, facing?: PlayerFacing): void {
    this.clearSoftCorrection();
    this.snapEngine.reset();
    this.pathQueue = [];
    this.movementMode = 'MANUAL';
    this.autoWalkVelocity = { x: 0, y: 0 };
    this.displayX = worldX;
    this.displayY = worldY;
    this.syncLogicalTileFromDisplay();
    if (facing) {
      this.facing = facing;
    }
  }

  applyServerPosition(
    worldX: number,
    worldY: number,
    facing?: PlayerFacing,
    options?: { readonly force?: boolean; readonly soft?: boolean },
  ): void {
    if (options?.soft && !options.force) {
      if (facing) {
        this.facing = facing;
      }
      // Em movimento: micro-puxão (não cancela WASD). Parado: lerp ~80ms.
      if (this.isMoving) {
        this.displayX += (worldX - this.displayX) * 0.35;
        this.displayY += (worldY - this.displayY) * 0.35;
        this.syncLogicalTileFromDisplay();
        return;
      }
      this.softCorrectTarget = { x: worldX, y: worldY };
      this.softCorrectRemainingMs = PlayerHybridLocomotion.SOFT_CORRECT_MS;
      return;
    }

    if (this.isMoving && !options?.force) return;
    this.clearSoftCorrection();
    this.snapEngine.reset();
    this.pathQueue = [];
    this.movementMode = 'MANUAL';
    this.autoWalkVelocity = { x: 0, y: 0 };
    this.displayX = worldX;
    this.displayY = worldY;
    this.syncLogicalTileFromDisplay();
    if (facing) {
      this.facing = facing;
    }
  }

  private clearSoftCorrection(): void {
    this.softCorrectTarget = null;
    this.softCorrectRemainingMs = 0;
  }

  private tickSoftCorrection(deltaMs: number): void {
    const target = this.softCorrectTarget;
    if (!target || this.softCorrectRemainingMs <= 0) {
      this.clearSoftCorrection();
      return;
    }

    const stepMs = Math.min(deltaMs, this.softCorrectRemainingMs);
    const t = stepMs / this.softCorrectRemainingMs;
    this.displayX += (target.x - this.displayX) * t;
    this.displayY += (target.y - this.displayY) * t;
    this.softCorrectRemainingMs -= stepMs;

    if (this.softCorrectRemainingMs <= 0) {
      this.displayX = target.x;
      this.displayY = target.y;
      this.clearSoftCorrection();
      this.syncLogicalTileFromDisplay();
    }
  }

  tick(
    deltaMs: number,
    mapData: number[][],
    input: CardinalInput | null,
    config: HybridLocomotionTickConfig,
    onStepCommitted: (step: GridStep) => void,
    onMovementBlocked?: () => void,
  ): void {
    const frameMs = clampFrameDeltaMs(deltaMs);
    const bounds = this.resolveMapBounds(mapData);
    const walkSpeed = resolveMoveSpeedPxPerSec(
      config.speedBonusTotal,
      config.isEncumbered,
      resolvePlayerMoveSpeedPxPerSec(getActiveMapTileSize()),
    );

    if (input) {
      this.clearSoftCorrection();
      this.enterManualFromKeyboard();
      this.tickManual(
        input,
        frameMs,
        walkSpeed,
        mapData,
        bounds,
        onStepCommitted,
        onMovementBlocked,
      );
      return;
    }

    if (this.softCorrectTarget) {
      this.tickSoftCorrection(frameMs);
      return;
    }

    if (this.movementMode === 'AUTO' && this.pathQueue.length > 0) {
      this.tickAuto(frameMs, walkSpeed, mapData, bounds, onStepCommitted);
      return;
    }

    this.movementMode = 'MANUAL';
    this.snapEngine.reset();
    this.autoWalkVelocity = { x: 0, y: 0 };
  }

  private tickManual(
    input: CardinalInput,
    deltaMs: number,
    maxSpeed: number,
    mapData: number[][],
    bounds: { width: number; height: number },
    onStepCommitted: (step: GridStep) => void,
    onMovementBlocked?: () => void,
  ): void {
    const moveVector = composeMoveVector(input);
    if (!moveVector) {
      this.snapEngine.reset();
      return;
    }

    // Direção imediata ao pressionar tecla — não esperar deslocamento do snap engine.
    this.facing = moveVectorToFacing(
      Math.sign(moveVector.dx) as -1 | 0 | 1,
      Math.sign(moveVector.dy) as -1 | 0 | 1,
    );

    const displacement = this.snapEngine.update(
      { x: moveVector.dx, y: moveVector.dy },
      deltaMs,
      maxSpeed,
    );

    if (displacement.x === 0 && displacement.y === 0) {
      return;
    }

    const from = this.currentPosition();
    const next = moveByDelta(
      from,
      displacement.x,
      displacement.y,
      mapData,
      bounds.width,
      bounds.height,
    );

    if (next.x === from.x && next.y === from.y) {
      // Parede: para + realinha cursor de intent (não enfileira passos fantasmas).
      onMovementBlocked?.();
      return;
    }

    this.displayX = next.x;
    this.displayY = next.y;
    this.syncNetworkTile(mapData, onStepCommitted);
  }

  private tickAuto(
    deltaMs: number,
    walkSpeed: number,
    mapData: number[][],
    bounds: { width: number; height: number },
    onStepCommitted: (step: GridStep) => void,
  ): void {
    const head = this.pathQueue[0];
    if (!head) {
      this.finishAutoPath();
      return;
    }

    const dx = head.x - this.displayX;
    const dy = head.y - this.displayY;
    const dist = Math.hypot(dx, dy);

    if (dist <= PATH_WAYPOINT_ARRIVAL_PX) {
      this.displayX = head.x;
      this.displayY = head.y;
      this.pathQueue.shift();
      this.syncLogicalTileFromDisplay();
      this.syncNetworkTile(mapData, onStepCommitted);

      if (this.pathQueue.length === 0) {
        this.finishAutoPath();
      }
      return;
    }

    const travel = walkSpeed * (deltaMs / 1000);
    const stepDistance = Math.min(travel, dist);
    const direction = normalizeWorldVector(dx, dy);
    if (!direction) return;

    this.autoWalkVelocity = {
      x: direction.dx * walkSpeed,
      y: direction.dy * walkSpeed,
    };

    const from = this.currentPosition();
    const next = moveByDelta(
      from,
      direction.dx * stepDistance,
      direction.dy * stepDistance,
      mapData,
      bounds.width,
      bounds.height,
    );

    if (next.x === from.x && next.y === from.y) {
      this.finishAutoPath();
      return;
    }

    this.displayX = next.x;
    this.displayY = next.y;
    this.facing = moveVectorToFacing(
      Math.sign(direction.dx) as -1 | 0 | 1,
      Math.sign(direction.dy) as -1 | 0 | 1,
    );
    this.syncNetworkTile(mapData, onStepCommitted);
  }

  private finishAutoPath(): void {
    this.pathQueue = [];
    this.movementMode = 'MANUAL';
    this.autoWalkVelocity = { x: 0, y: 0 };
    this.snapEngine.reset();
  }

  private syncLogicalTileFromDisplay(): void {
    const tile = worldPixelToTile(this.displayX, this.displayY);
    this.tileX = tile.tileX;
    this.tileY = tile.tileY;
  }

  private syncNetworkTile(
    mapData: number[][],
    onStepCommitted: (step: GridStep) => void,
  ): void {
    const target = worldPixelToTile(this.displayX, this.displayY);
    let guard = 0;
    const maxSteps = isAuthoritativeMovementOnline() ? 1 : 4;

    while (
      (target.tileX !== this.tileX || target.tileY !== this.tileY)
      && guard < maxSteps
    ) {
      guard += 1;
      const stepXRaw = Math.sign(target.tileX - this.tileX) as -1 | 0 | 1;
      const stepYRaw = Math.sign(target.tileY - this.tileY) as -1 | 0 | 1;
      if (stepXRaw === 0 && stepYRaw === 0) break;

      let stepX = stepXRaw;
      let stepY = stepYRaw;
      if (stepX !== 0 && stepY !== 0) {
        if (Math.abs(target.tileX - this.tileX) >= Math.abs(target.tileY - this.tileY)) {
          stepY = 0;
        } else {
          stepX = 0;
        }
      }

      const origin = tileCenterToWorldPixel(this.tileX, this.tileY);
      const next = tryGridStep(origin, { stepX, stepY }, mapData);
      if (!next) break;

      const nextTile = worldPixelToTile(next.x, next.y);
      this.tileX = nextTile.tileX;
      this.tileY = nextTile.tileY;
      onStepCommitted({ stepX, stepY });
    }
  }

  private currentPosition(): WorldPosition {
    return { x: this.displayX, y: this.displayY };
  }

  private resolveMapBounds(mapData: number[][]): { width: number; height: number } {
    const rows = mapData.length;
    const cols = mapData[0]?.length ?? 0;
    const tileSize = getActiveMapTileSize();
    return {
      width: Math.max(tileSize, cols * tileSize),
      height: Math.max(tileSize, rows * tileSize),
    };
  }
}
