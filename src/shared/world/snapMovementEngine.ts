/** Vetor 2D para input e velocidade. */
export type Vector2 = {
  readonly x: number;
  readonly y: number;
};

export type SnapMovementConfig = {
  /**
   * Mantido por compat. O impulso é linear: velocidade máxima enquanto há input,
   * zero no frame em que o input some (sem rampa / sem deslize).
   */
  readonly acceleration?: number;
};

export const DEFAULT_SNAP_MOVEMENT_CONFIG: SnapMovementConfig = {};

/**
 * Movimento direto — Key Down = velocidade máxima na direção, Key Up = para agora.
 * Sem fila de aceleração: o “dash” é o próprio impulso linear do frame.
 */
export class SnapMovementEngine {
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(_config: SnapMovementConfig = DEFAULT_SNAP_MOVEMENT_CONFIG) {}

  /**
   * Atualiza velocidade e retorna deslocamento do frame (px).
   * `input` deve ser direção normalizada ou zero.
   */
  update(input: Vector2, deltaMs: number, maxSpeedPxPerSec: number): Vector2 {
    const dt = Math.max(0, deltaMs) / 1000;
    if (dt <= 0) {
      return { x: 0, y: 0 };
    }

    if (input.x === 0 && input.y === 0) {
      this.velocity = { x: 0, y: 0 };
      return { x: 0, y: 0 };
    }

    const inputLen = Math.hypot(input.x, input.y);
    const normX = input.x / inputLen;
    const normY = input.y / inputLen;
    this.velocity = {
      x: normX * maxSpeedPxPerSec,
      y: normY * maxSpeedPxPerSec,
    };

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
}
