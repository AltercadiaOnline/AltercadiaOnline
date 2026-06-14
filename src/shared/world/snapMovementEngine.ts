import { PLAYER_BASE_MOVE_SPEED_MULTIPLIER } from './movement.js';

/** Vetor 2D para input e velocidade. */
export type Vector2 = {
  readonly x: number;
  readonly y: number;
};

export type SnapMovementConfig = {
  /** Aceleração em px/s² na direção do input. */
  readonly acceleration: number;
};

const SNAP_BASE_ACCELERATION_PX_PER_SEC2 = 2400;

export const DEFAULT_SNAP_MOVEMENT_CONFIG: SnapMovementConfig = {
  acceleration: SNAP_BASE_ACCELERATION_PX_PER_SEC2 * PLAYER_BASE_MOVE_SPEED_MULTIPLIER,
};

/**
 * Movimento estilo MMO — acelera com input e para na hora (sem atrito/deslize).
 */
export class SnapMovementEngine {
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(private readonly config: SnapMovementConfig = DEFAULT_SNAP_MOVEMENT_CONFIG) {}

  /**
   * Atualiza velocidade e retorna deslocamento do frame (px).
   * `input` deve ser direção normalizada ou zero.
   */
  update(input: Vector2, deltaMs: number, maxSpeedPxPerSec: number): Vector2 {
    const dt = Math.max(0, deltaMs) / 1000;
    if (dt <= 0) return { x: 0, y: 0 };

    const isMoving = input.x !== 0 || input.y !== 0;

    if (isMoving) {
      const inputLen = Math.hypot(input.x, input.y);
      const normX = input.x / inputLen;
      const normY = input.y / inputLen;
      const vx = input.x === 0 ? 0 : this.velocity.x;
      const vy = input.y === 0 ? 0 : this.velocity.y;
      this.velocity = {
        x: vx + normX * this.config.acceleration * dt,
        y: vy + normY * this.config.acceleration * dt,
      };
    } else {
      this.velocity = { x: 0, y: 0 };
    }

    this.applySpeedCap(maxSpeedPxPerSec);

    return {
      x: this.velocity.x * dt,
      y: this.velocity.y * dt,
    };
  }

  reset(): void {
    this.velocity = { x: 0, y: 0 };
  }

  getVelocity(): Vector2 {
    return { ...this.velocity };
  }

  isMoving(): boolean {
    return this.velocity.x !== 0 || this.velocity.y !== 0;
  }

  private applySpeedCap(maxSpeedPxPerSec: number): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed <= maxSpeedPxPerSec) return;

    this.velocity = {
      x: (this.velocity.x / speed) * maxSpeedPxPerSec,
      y: (this.velocity.y / speed) * maxSpeedPxPerSec,
    };
  }
}
