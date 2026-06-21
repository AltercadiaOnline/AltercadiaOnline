import { BATTLE_TURN_TIMER_SEC } from '../../shared/combat/battleScreenConstants.js';
import { BATTLE_TURN_CHOICE_BUDGET_MS } from '../../shared/combatWire.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';

export const BATTLE_TURN_TIMER_TICK_MS = 100;

/** Máscara de exibição — cap em 10s; grace (>10s restantes) mostra 10 estático. */
export function resolveBattleTurnDisplaySec(
  deadlineMs: number,
  nowMs = Date.now(),
  maxDisplaySec = BATTLE_TURN_TIMER_SEC,
): number {
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  return Math.min(maxDisplaySec, Math.ceil(remainingMs / 1000));
}

export type BattleTurnTimerSync = {
  readonly enabled: boolean;
  readonly deadlineMs?: number;
  readonly choiceBudgetMs?: number;
  readonly playbackGraceMs?: number;
};

/**
 * Cronômetro autoritativo do turno — espelha battleHudStore (React).
 */
export class BattleTurnTimer {
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private activeSyncKey: string | null = null;
  private deadlineMs: number | undefined;
  private choiceBudgetMs: number;
  private playbackGraceMs = 0;
  private onExpired: (() => void) | null = null;
  private expiredNotified = false;

  constructor(choiceBudgetMs = BATTLE_TURN_CHOICE_BUDGET_MS) {
    this.choiceBudgetMs = choiceBudgetMs;
  }

  setOnExpired(handler: (() => void) | null): void {
    this.onExpired = handler;
  }

  sync(input: BattleTurnTimerSync, windowKey?: string | null): void {
    const syncKey = input.enabled && input.deadlineMs !== undefined
      ? `active:${windowKey ?? input.deadlineMs}`
      : 'idle';

    if (syncKey === this.activeSyncKey && this.timerHandle !== null) {
      return;
    }

    this.activeSyncKey = syncKey;
    this.stopInterval();
    this.expiredNotified = false;

    if (!input.enabled || input.deadlineMs === undefined) {
      this.deadlineMs = undefined;
      this.renderIdle(input.enabled);
      return;
    }

    this.deadlineMs = input.deadlineMs;
    this.choiceBudgetMs = input.choiceBudgetMs ?? BATTLE_TURN_CHOICE_BUDGET_MS;
    this.playbackGraceMs = Math.max(0, input.playbackGraceMs ?? 0);

    if (this.deadlineMs <= Date.now()) {
      this.renderProgress(0, 0, 0);
      if (!this.expiredNotified) {
        this.expiredNotified = true;
        const notify = this.onExpired;
        if (notify) {
          queueMicrotask(() => {
            notify();
          });
        }
      }
      return;
    }

    const tick = () => this.tickFrame();
    tick();
    this.timerHandle = setInterval(tick, BATTLE_TURN_TIMER_TICK_MS);
  }

  reset(): void {
    this.activeSyncKey = null;
    this.deadlineMs = undefined;
    this.expiredNotified = false;
    this.stopInterval();
    this.renderIdle(false);
  }

  isRunning(): boolean {
    return this.timerHandle !== null;
  }

  getActiveDeadlineMs(): number | undefined {
    return this.deadlineMs;
  }

  private tickFrame(): void {
    if (this.deadlineMs === undefined) return;

    const now = Date.now();
    const remainingMs = Math.max(0, this.deadlineMs - now);
    const displayTime = resolveBattleTurnDisplaySec(this.deadlineMs, now);

    const ratio = remainingMs > this.choiceBudgetMs
      ? 1
      : (this.choiceBudgetMs > 0 ? remainingMs / this.choiceBudgetMs : 0);

    this.renderProgress(ratio, displayTime, remainingMs);

    if (remainingMs <= 0) {
      this.stopInterval();
      this.activeSyncKey = 'idle';
      this.deadlineMs = undefined;
      if (!this.expiredNotified) {
        this.expiredNotified = true;
        const notify = this.onExpired;
        if (notify) {
          queueMicrotask(() => {
            notify();
          });
        }
      }
    }
  }

  private renderProgress(ratio: number, displayTime: number, remainingMs: number): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    const isUrgent = displayTime > 0 && displayTime <= 3 && remainingMs <= this.choiceBudgetMs;
    getBattleHudBridge().setTurnTimer({
      enabled: true,
      displaySec: Math.max(0, displayTime),
      barRatio: clamped,
      isUrgent,
    });
  }

  private renderIdle(enabled: boolean): void {
    getBattleHudBridge().setTurnTimer({
      enabled,
      displaySec: enabled ? BATTLE_TURN_TIMER_SEC : 0,
      barRatio: 0,
      isUrgent: false,
    });
  }

  private stopInterval(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
