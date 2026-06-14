import { resolveGridStepDurationMs } from '../../shared/character/playerStatsBonus.js';
import {
  composeGridStep,
  interpolateGridSlide,
  lockWorldToGrid,
  stepTowardTile,
  tilesEqual,
  tryGridStep,
  type GridStep,
  type GridTileCoord,
} from '../../shared/world/gridMovement.js';
import type { CardinalInput } from '../../shared/world/movementInput.js';
import {
  moveVectorToFacing,
  type PlayerFacing,
} from '../../shared/world/playerFacing.js';
import { clampFrameDeltaMs, type WorldPosition } from '../../shared/world/movement.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';

export type ActiveGridStep = {
  readonly from: WorldPosition;
  readonly to: WorldPosition;
  readonly toTile: GridTileCoord;
  readonly step: GridStep;
  elapsedMs: number;
  readonly durationMs: number;
};

export type GridLocomotionTickConfig = {
  readonly speedBonusTotal: number;
  readonly isEncumbered: boolean;
};

export type GridLocomotionSnapshot = {
  readonly tileX: number;
  readonly tileY: number;
  readonly displayX: number;
  readonly displayY: number;
  readonly facing: PlayerFacing;
};

/**
 * Locomoção por grade — 1 SQM por vez com slide linear entre centros.
 * Sem física/flutuação: tile lógico é a única autoridade local.
 */
export class PlayerGridLocomotion {
  tileX = 0;
  tileY = 0;
  displayX = 0;
  displayY = 0;
  facing: PlayerFacing = 'south';
  walkPath: GridTileCoord[] = [];
  private activeStep: ActiveGridStep | null = null;

  constructor(worldX: number, worldY: number, facing: PlayerFacing = 'south') {
    this.forceWorldPosition(worldX, worldY, facing);
  }

  get isMoving(): boolean {
    return this.activeStep !== null || this.walkPath.length > 0;
  }

  get hasActiveStep(): boolean {
    return this.activeStep !== null;
  }

  snapshot(): GridLocomotionSnapshot {
    return {
      tileX: this.tileX,
      tileY: this.tileY,
      displayX: this.displayX,
      displayY: this.displayY,
      facing: this.facing,
    };
  }

  setWalkPath(path: readonly GridTileCoord[]): void {
    this.walkPath = [...path];
  }

  clearWalkPath(): void {
    this.walkPath = [];
  }

  stop(): void {
    this.activeStep = null;
    this.walkPath = [];
    this.snapDisplayToTile();
  }

  forceWorldPosition(worldX: number, worldY: number, facing?: PlayerFacing): void {
    const locked = lockWorldToGrid(worldX, worldY);
    const tile = worldPixelToTile(locked.x, locked.y);
    this.activeStep = null;
    this.walkPath = [];
    this.tileX = tile.tileX;
    this.tileY = tile.tileY;
    this.displayX = locked.x;
    this.displayY = locked.y;
    if (facing) {
      this.facing = facing;
    }
  }

  applyServerTile(tileX: number, tileY: number, facing?: PlayerFacing): void {
    if (this.activeStep) return;
    if (this.tileX === tileX && this.tileY === tileY) return;
    this.activeStep = null;
    this.walkPath = [];
    this.tileX = tileX;
    this.tileY = tileY;
    this.snapDisplayToTile();
    if (facing) {
      this.facing = facing;
    }
  }

  tick(
    deltaMs: number,
    mapData: number[][],
    input: CardinalInput | null,
    config: GridLocomotionTickConfig,
    onStepCommitted: (step: GridStep) => void,
  ): void {
    const frameMs = clampFrameDeltaMs(deltaMs);
    this.advanceActiveStep(frameMs);

    let guard = 0;
    while (!this.activeStep && guard < 2) {
      guard += 1;
      const step = this.resolveDesiredStep(input);
      if (!step) break;
      if (!this.tryBeginStep(step, mapData, config, onStepCommitted)) break;
    }
  }

  private advanceActiveStep(deltaMs: number): void {
    const step = this.activeStep;
    if (!step) return;

    step.elapsedMs += deltaMs;
    const progress = Math.min(1, step.elapsedMs / step.durationMs);
    const display = interpolateGridSlide(step.from, step.to, progress);
    this.displayX = display.x;
    this.displayY = display.y;

    if (progress < 1) return;

    this.tileX = step.toTile.tileX;
    this.tileY = step.toTile.tileY;
    this.displayX = step.to.x;
    this.displayY = step.to.y;
    this.activeStep = null;
    this.consumeWalkPathHead();
  }

  private resolveDesiredStep(input: CardinalInput | null): GridStep | null {
    if (input) {
      return composeGridStep(input);
    }

    const head = this.walkPath[0];
    if (!head) return null;

    return stepTowardTile({ tileX: this.tileX, tileY: this.tileY }, head);
  }

  private tryBeginStep(
    step: GridStep,
    mapData: number[][],
    config: GridLocomotionTickConfig,
    onStepCommitted: (step: GridStep) => void,
  ): boolean {
    const from = tileCenterToWorldPixel(this.tileX, this.tileY);
    const to = tryGridStep(from, step, mapData);
    if (!to) {
      if (!this.hasMovementInput(step)) {
        this.clearWalkPath();
      }
      return false;
    }

    const toTile = worldPixelToTile(to.x, to.y);
    this.activeStep = {
      from,
      to,
      toTile,
      step,
      elapsedMs: 0,
      durationMs: resolveGridStepDurationMs(config.speedBonusTotal, config.isEncumbered),
    };
    this.facing = moveVectorToFacing(step.stepX, step.stepY);
    onStepCommitted(step);
    return true;
  }

  private consumeWalkPathHead(): void {
    const head = this.walkPath[0];
    if (!head) return;
    if (tilesEqual(head, { tileX: this.tileX, tileY: this.tileY })) {
      this.walkPath.shift();
    }
  }

  private snapDisplayToTile(): void {
    const center = tileCenterToWorldPixel(this.tileX, this.tileY);
    this.displayX = center.x;
    this.displayY = center.y;
  }

  private hasMovementInput(step: GridStep): boolean {
    return step.stepX !== 0 || step.stepY !== 0;
  }
}
