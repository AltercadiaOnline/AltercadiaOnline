/** Vetor 2D para input e velocidade. */
export type Vector2 = {
  readonly x: number;
  readonly y: number;
};

export type PhysicsEngineConfig = {
  /** Multiplicador por frame (60fps) — maior = para mais rápido. */
  readonly friction: number;
  /** Aceleração em px/s² na direção do input. */
  readonly acceleration: number;
  /** Velocidade mínima (px/s) zerada para evitar drift. */
  readonly stopEpsilon: number;
};

export const DEFAULT_PHYSICS_CONFIG: PhysicsEngineConfig = {
  friction: 0.85,
  acceleration: 2400,
  stopEpsilon: 0.1,
};

const BASE_FRAME_MS = 1000 / 60;

/**
 * Motor de velocidade com atrito — acelera na direção do input, limita velocidade
 * e zera micro-velocidades para evitar deslize entre tiles.
 */
export class PhysicsEngine {
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(private readonly config: PhysicsEngineConfig = DEFAULT_PHYSICS_CONFIG) {}

  /** Deslocamento (px) deste frame — input normalizado (-1..1 por eixo). */
  step(input: Vector2, deltaMs: number, maxSpeedPxPerSec: number): Vector2 {
    const dt = Math.max(0, deltaMs) / 1000;
    if (dt <= 0) return { x: 0, y: 0 };

    const inputLen = Math.hypot(input.x, input.y);
    const normX = inputLen > 0 ? input.x / inputLen : 0;
    const normY = inputLen > 0 ? input.y / inputLen : 0;

    this.velocity = {
      x: this.velocity.x + normX * this.config.acceleration * dt,
      y: this.velocity.y + normY * this.config.acceleration * dt,
    };

    const friction = this.config.friction ** (deltaMs / BASE_FRAME_MS);
    this.velocity = {
      x: this.velocity.x * friction,
      y: this.velocity.y * friction,
    };

    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > maxSpeedPxPerSec) {
      this.velocity = {
        x: (this.velocity.x / speed) * maxSpeedPxPerSec,
        y: (this.velocity.y / speed) * maxSpeedPxPerSec,
      };
    }

    if (Math.abs(this.velocity.x) < this.config.stopEpsilon) this.velocity = { ...this.velocity, x: 0 };
    if (Math.abs(this.velocity.y) < this.config.stopEpsilon) this.velocity = { ...this.velocity, y: 0 };

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
}
