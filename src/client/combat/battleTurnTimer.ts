import { BATTLE_TURN_TIMER_SEC } from '../../shared/combat/battleScreenConstants.js';
import { BATTLE_TURN_CHOICE_BUDGET_MS } from '../../shared/combatWire.js';

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

export type BattleTurnTimerUi = {
  readonly label: HTMLElement | null;
  readonly barFill: HTMLElement | null;
};

export type BattleTurnTimerSync = {
  readonly enabled: boolean;
  readonly deadlineMs?: number;
  /** Orçamento de escolha — travado ao abrir a janela (ex.: 10s). */
  readonly choiceBudgetMs?: number;
  /** Grace de animação antes do countdown — travado ao abrir a janela. */
  readonly playbackGraceMs?: number;
};

/**
 * Cronômetro autoritativo do turno — isolado da paleta/moveset/mastery.
 * Só reinicia o intervalo quando a janela de escolha muda (deadline ou on/off).
 */
export class BattleTurnTimer {
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private activeSyncKey: string | null = null;
  private deadlineMs: number | undefined;
  private choiceBudgetMs: number;
  private playbackGraceMs = 0;
  private onExpired: (() => void) | null = null;
  private expiredNotified = false;

  constructor(
    private ui: BattleTurnTimerUi,
    choiceBudgetMs = BATTLE_TURN_CHOICE_BUDGET_MS,
  ) {
    this.choiceBudgetMs = choiceBudgetMs;
  }

  bindUi(ui: BattleTurnTimerUi): void {
    this.ui = ui;
  }

  setOnExpired(handler: (() => void) | null): void {
    this.onExpired = handler;
  }

  /** Espelha deadline do servidor — não reinicia se a janela ativa for a mesma. */
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
        this.onExpired?.();
      }
    }
  }

  private renderProgress(ratio: number, displayTime: number, remainingMs: number): void {
    const fill = this.ui.barFill;
    if (fill) {
      const clamped = Math.min(1, Math.max(0, ratio));
      fill.style.width = `${clamped * 100}%`;
      fill.classList.toggle('is-empty', clamped <= 0);
      fill.classList.toggle('is-urgent', clamped > 0 && clamped <= 0.3);
    }

    const label = this.ui.label;
    if (label) {
      label.textContent = String(Math.max(0, displayTime));
      label.classList.toggle(
        'is-urgent',
        displayTime > 0 && displayTime <= 3 && remainingMs <= this.choiceBudgetMs,
      );
    }
  }

  private renderIdle(enabled: boolean): void {
    const fill = this.ui.barFill;
    if (fill) {
      fill.style.width = '0%';
      fill.classList.add('is-empty');
      fill.classList.remove('is-urgent');
    }

    const label = this.ui.label;
    if (label) {
      label.textContent = enabled ? String(BATTLE_TURN_TIMER_SEC) : '—';
      label.classList.remove('is-urgent');
    }
  }

  private stopInterval(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
