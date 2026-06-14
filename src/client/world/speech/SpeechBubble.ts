import {
  SPEECH_BUBBLE_FADE_MS,
  SPEECH_BUBBLE_LIFETIME_MS,
} from '../../../shared/world/speechBubbleConstants.js';
import { normalizeSpeechBubbleText } from '../../../shared/world/speechBubbleText.js';

export type SpeechBubbleOptions = {
  readonly text: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly anchorTopY: number;
  readonly stackOffsetY?: number;
  readonly lifetimeMs?: number;
  readonly fadeMs?: number;
  readonly createdAt?: number;
};

/** Balão de fala sobre um personagem — estado puro para render no Canvas2D. */
export class SpeechBubble {
  readonly text: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly anchorTopY: number;
  readonly stackOffsetY: number;
  readonly lifetimeMs: number;
  readonly fadeMs: number;
  readonly createdAt: number;

  constructor(options: SpeechBubbleOptions) {
    this.text = normalizeSpeechBubbleText(options.text);
    this.worldX = options.worldX;
    this.worldY = options.worldY;
    this.anchorTopY = options.anchorTopY;
    this.stackOffsetY = options.stackOffsetY ?? 0;
    this.lifetimeMs = options.lifetimeMs ?? SPEECH_BUBBLE_LIFETIME_MS;
    this.fadeMs = options.fadeMs ?? SPEECH_BUBBLE_FADE_MS;
    this.createdAt = options.createdAt ?? Date.now();
  }

  get drawAnchorY(): number {
    return this.anchorTopY - this.stackOffsetY;
  }

  isExpired(now = Date.now()): boolean {
    return now - this.createdAt >= this.lifetimeMs;
  }

  /** 1.0 até o fade; linear até 0 nos últimos `fadeMs`. */
  getAlpha(now = Date.now()): number {
    const elapsed = now - this.createdAt;
    if (elapsed >= this.lifetimeMs) return 0;
    const fadeStart = this.lifetimeMs - this.fadeMs;
    if (elapsed <= fadeStart) return 1;
    const t = (elapsed - fadeStart) / this.fadeMs;
    return Math.max(0, 1 - t);
  }
}
