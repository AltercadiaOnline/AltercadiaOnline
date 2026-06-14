/** Período da respiração — mais lento e profundo que o pet. */
export const IDLE_BREATH_PERIOD_MS = 800;

/** Deslocamento vertical máximo (px) — sin(t) * amplitude; subpixel mínimo para pixel art. */
export const IDLE_BREATH_AMPLITUDE_Y = 0.5;

/** Sem escala em idle — evita “tilt”/tremor no sprite. */
export const IDLE_BREATH_SCALE_DELTA = 0;

/** Suavização ao entrar em idle (ms). */
export const IDLE_BREATH_BLEND_IN_MS = 140;

/** Suavização ao sair para caminhada (ms) — rápido, sem conflitar com walk. */
export const IDLE_BREATH_BLEND_OUT_MS = 45;

export type IdleBreathSample = {
  readonly offsetY: number;
  readonly scale: number;
};

export const IDLE_BREATH_NEUTRAL: IdleBreathSample = {
  offsetY: 0,
  scale: 1,
};

function expBlend(current: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return target;
  const t = 1 - Math.exp(-deltaMs / tauMs);
  return current + (target - current) * t;
}

/**
 * Respiração sutil em idle — escala + deslocamento Y no sprite principal.
 * Interrompe a oscilação ao caminhar; blend com lerp na entrada/saída.
 */
export class IdleBreathingAnimation {
  private blend = 0;
  /** Oscilação ativa só em idle — desliga no mesmo frame ao caminhar. */
  private oscillating = false;
  private lastTimestampMs = -1;

  reset(): void {
    this.blend = 0;
    this.oscillating = false;
    this.lastTimestampMs = -1;
  }

  update(options: { readonly isIdle: boolean; readonly timestampMs: number }): void {
    const { isIdle, timestampMs } = options;
    const deltaMs =
      this.lastTimestampMs >= 0
        ? Math.min(48, Math.max(0, timestampMs - this.lastTimestampMs))
        : 16.67;
    this.lastTimestampMs = timestampMs;

    if (!isIdle) {
      this.oscillating = false;
    } else {
      this.oscillating = true;
    }

    const target = isIdle ? 1 : 0;
    const tauMs = isIdle ? IDLE_BREATH_BLEND_IN_MS : IDLE_BREATH_BLEND_OUT_MS;
    this.blend = expBlend(this.blend, target, deltaMs, tauMs);

    if (!isIdle && this.blend < 0.001) {
      this.blend = 0;
    }
  }

  sample(timestampMs: number): IdleBreathSample {
    if (!this.oscillating || this.blend <= 0.001) {
      return IDLE_BREATH_NEUTRAL;
    }

    const wave = Math.sin(timestampMs / IDLE_BREATH_PERIOD_MS);
    const weight = this.blend;

    return {
      offsetY: wave * IDLE_BREATH_AMPLITUDE_Y * weight,
      scale: 1 + wave * IDLE_BREATH_SCALE_DELTA * weight,
    };
  }

  /**
   * Aplica transformação no ctx — pivô na base do sprite (pés), preservando ordem de desenho.
   */
  applyTransform(
    ctx: CanvasRenderingContext2D,
    drawX: number,
    drawY: number,
    width: number,
    height: number,
    sample: IdleBreathSample = IDLE_BREATH_NEUTRAL,
  ): void {
    if (sample.scale === 1 && sample.offsetY === 0) {
      return;
    }

    const anchorX = drawX + width / 2;
    const anchorY = drawY + height;

    ctx.translate(anchorX, anchorY);
    ctx.scale(sample.scale, sample.scale);
    ctx.translate(-anchorX, -anchorY);
    ctx.translate(0, sample.offsetY);
  }
}
