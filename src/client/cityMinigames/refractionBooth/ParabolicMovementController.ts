export type ParabolicMovementConfig = {
  readonly spawnX: number;
  readonly groundY: number;
  readonly initialVyNormPerMs: number;
  readonly gravityNormPerMs2: number;
  /** Velocidade horizontal assinada — pato vai e volta entre limites. */
  readonly horizontalSpeedNormPerMs: number;
  readonly horizontalMin: number;
  readonly horizontalMax: number;
};

export type ParabolicMovementPhase = 'airborne' | 'landed';

/**
 * Salto parabólico vertical + deriva horizontal em vaivém.
 * y(t) = groundY + vy₀·t + ½·g·t² ; x oscila entre horizontalMin e horizontalMax.
 */
export class ParabolicMovementController {
  private x: number;
  private y: number;
  private vy: number;
  private vx: number;
  private readonly groundY: number;
  private readonly gravity: number;
  private readonly horizontalMin: number;
  private readonly horizontalMax: number;

  constructor(config: ParabolicMovementConfig) {
    this.x = config.spawnX;
    this.y = config.groundY;
    this.vy = config.initialVyNormPerMs;
    this.vx = config.horizontalSpeedNormPerMs;
    this.groundY = config.groundY;
    this.gravity = config.gravityNormPerMs2;
    this.horizontalMin = config.horizontalMin;
    this.horizontalMax = config.horizontalMax;
  }

  getPosition(): { readonly x: number; readonly y: number } {
    return { x: this.x, y: this.y };
  }

  getVerticalVelocity(): number {
    return this.vy;
  }

  getHorizontalVelocity(): number {
    return this.vx;
  }

  update(deltaMs: number): ParabolicMovementPhase {
    if (deltaMs <= 0) return 'airborne';

    this.vy += this.gravity * deltaMs;
    this.y += this.vy * deltaMs;

    this.x += this.vx * deltaMs;
    if (this.x <= this.horizontalMin) {
      this.x = this.horizontalMin;
      this.vx = Math.abs(this.vx);
    } else if (this.x >= this.horizontalMax) {
      this.x = this.horizontalMax;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y >= this.groundY && this.vy >= 0) {
      this.y = this.groundY;
      this.vy = 0;
      this.vx = 0;
      return 'landed';
    }

    return 'airborne';
  }
}
