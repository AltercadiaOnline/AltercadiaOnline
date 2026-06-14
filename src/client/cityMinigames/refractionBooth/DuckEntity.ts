import {
  ParabolicMovementController,
  type ParabolicMovementConfig,
} from './ParabolicMovementController.js';
import type { TargetEntity, TargetEntityState, TargetRenderContext } from './TargetEntity.js';

export type DuckEntityConfig = {
  readonly spawnX?: number;
  readonly spawnXMin?: number;
  readonly spawnXMax?: number;
  readonly groundYNorm?: number;
  readonly jumpSpeedNormPerMs?: number;
  readonly gravityNormPerMs2?: number;
  readonly horizontalSpeedNormPerMs?: number;
  readonly horizontalLaneRadius?: number;
  readonly hitRadiusNorm?: number;
};

const DEFAULT_GROUND_Y = 0.92;
const DEFAULT_SPAWN_X_MIN = 0.06;
const DEFAULT_SPAWN_X_MAX = 0.94;
const ARENA_X_MIN = 0.04;
const ARENA_X_MAX = 0.96;
const DEFAULT_HIT_RADIUS = 0.05;
const HIT_FALL_GRAVITY = 0.00000055;

function createRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildMovementConfig(
  id: number,
  config?: Partial<DuckEntityConfig>,
): ParabolicMovementConfig {
  const rng = createRng(id * 9973 + (Date.now() % 10000));
  const spawnMin = config?.spawnXMin ?? DEFAULT_SPAWN_X_MIN;
  const spawnMax = config?.spawnXMax ?? DEFAULT_SPAWN_X_MAX;
  const spawnX = config?.spawnX ?? (spawnMin + rng() * (spawnMax - spawnMin));
  const groundY = config?.groundYNorm ?? DEFAULT_GROUND_Y;

  // Arco mais curto e agressivo (~1,0–1,6 s no ar).
  const jumpSpeed = config?.jumpSpeedNormPerMs ?? (0.00068 + rng() * 0.00042);
  const gravity = config?.gravityNormPerMs2 ?? (0.00000072 + rng() * 0.00000038);

  // Faixa horizontal ampla — pato atravessa boa parte da arena indo e voltando.
  const laneRadius = config?.horizontalLaneRadius ?? (0.2 + rng() * 0.32);
  const horizontalMin = Math.max(ARENA_X_MIN, spawnX - laneRadius);
  const horizontalMax = Math.min(ARENA_X_MAX, spawnX + laneRadius);
  const baseHorizontalSpeed = config?.horizontalSpeedNormPerMs ?? (0.00014 + rng() * 0.00022);
  const horizontalSign = rng() < 0.5 ? -1 : 1;

  return {
    spawnX,
    groundY,
    initialVyNormPerMs: -jumpSpeed,
    gravityNormPerMs2: gravity,
    horizontalSpeedNormPerMs: horizontalSign * baseHorizontalSpeed,
    horizontalMin,
    horizontalMax,
  };
}

/** Pato estilo Duck Hunt — salto vertical rápido com vaivém horizontal. */
export class DuckEntity implements TargetEntity {
  readonly kind = 'duck';

  private _state: TargetEntityState = 'alive';
  private readonly movement: ParabolicMovementController;
  private readonly hitRadiusNorm: number;
  private fallX = 0;
  private fallY = 0;
  private fallVyNormPerMs = 0;
  private fallVxNormPerMs = 0;

  constructor(
    readonly id: number,
    config?: Partial<DuckEntityConfig>,
  ) {
    this.movement = new ParabolicMovementController(buildMovementConfig(id, config));
    this.hitRadiusNorm = config?.hitRadiusNorm ?? DEFAULT_HIT_RADIUS;
  }

  get state(): TargetEntityState {
    return this._state;
  }

  getPosition(): { readonly x: number; readonly y: number } {
    if (this._state === 'hit') {
      return { x: this.fallX, y: this.fallY };
    }
    return this.movement.getPosition();
  }

  applyHit(nowMs: number): void {
    if (this._state !== 'alive') return;
    const pos = this.movement.getPosition();
    this.fallX = pos.x;
    this.fallY = pos.y;
    this.fallVyNormPerMs = 0.00006;
    this.fallVxNormPerMs = this.movement.getHorizontalVelocity() * 0.4;
    this._state = 'hit';
    void nowMs;
  }

  update(deltaMs: number, nowMs: number): void {
    if (this._state === 'alive') {
      if (this.movement.update(deltaMs) === 'landed') {
        this._state = 'escaped';
      }
      return;
    }

    if (this._state === 'hit') {
      this.fallVyNormPerMs += HIT_FALL_GRAVITY * deltaMs;
      this.fallY += this.fallVyNormPerMs * deltaMs;
      this.fallX += this.fallVxNormPerMs * deltaMs;
      void nowMs;
    }
  }

  hitTest(normX: number, normY: number): boolean {
    if (this._state !== 'alive') return false;
    const { x, y } = this.movement.getPosition();
    const dx = normX - x;
    const dy = normY - y;
    return dx * dx + dy * dy <= this.hitRadiusNorm * this.hitRadiusNorm;
  }

  isFinished(): boolean {
    if (this._state === 'escaped') return true;
    if (this._state === 'hit' && this.fallY > 1.12) return true;
    return false;
  }

  render(context: TargetRenderContext): void {
    const { ctx, bounds } = context;
    const { x, y } = this.getPosition();
    const px = x * bounds.width;
    const py = y * bounds.height;
    const scale = bounds.width / 420;

    const facingLeft = this._state === 'hit'
      ? this.fallVxNormPerMs < 0
      : this.movement.getHorizontalVelocity() < 0;

    ctx.save();
    ctx.translate(px, py);
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    if (this._state === 'hit') {
      ctx.rotate(0.35);
    } else if (this._state === 'alive') {
      const vy = this.movement.getVerticalVelocity();
      const tilt = Math.max(-0.28, Math.min(0.28, -vy * 650));
      ctx.rotate(tilt);
    }

    this.drawDuckSprite(ctx, scale);
    ctx.restore();
  }

  private drawDuckSprite(ctx: CanvasRenderingContext2D, scale: number): void {
    const bodyW = 36 * scale;
    const bodyH = 22 * scale;
    const headR = 10 * scale;

    ctx.fillStyle = '#3d6b4f';
    ctx.strokeStyle = '#9fd4a8';
    ctx.lineWidth = Math.max(1, 1.5 * scale);

    ctx.beginPath();
    ctx.ellipse(0, 0, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bodyW * 0.28, -bodyH * 0.35, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.moveTo(bodyW * 0.38, -bodyH * 0.32);
    ctx.lineTo(bodyW * 0.58, -bodyH * 0.28);
    ctx.lineTo(bodyW * 0.38, -bodyH * 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(bodyW * 0.32, -bodyH * 0.38, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7ec8ff';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.ellipse(0, bodyH * 0.15, bodyW * 0.22, bodyH * 0.12, 0, 0, Math.PI);
    ctx.stroke();
  }
}
