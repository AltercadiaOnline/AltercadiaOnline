import { tacticalSprayService } from '../../shared/social/tacticalSprayStore.js';
import {
  resolveLatestElapsedWorldSprayResetAtMs,
  resolveNextWorldSprayResetAtMs,
  shouldApplyWorldSprayWeeklyReset,
} from '../../shared/social/worldSprayWeeklyReset.js';
import {
  persistWorldSpraySnapshot,
  stampWorldSprayWeeklyReset,
  getWorldSprayLastWeeklyResetAtMs,
} from '../persistence/worldSprayPersistence.js';
import { markWorldSpraySyncDirty } from './spraySyncDirty.js';

const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

async function applyWeeklyWipe(nowMs: number, reason: string): Promise<void> {
  const cleared = tacticalSprayService.resetAllWorldSprays();
  stampWorldSprayWeeklyReset(resolveLatestElapsedWorldSprayResetAtMs(nowMs));
  markWorldSpraySyncDirty();
  await persistWorldSpraySnapshot();
  console.log(`[world-spray] ${reason}: ${cleared} pixo(s) removido(s). Próximo corte: segunda 07h BRT.`);
}

function armNext(nowMs: number): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }

  const nextAt = resolveNextWorldSprayResetAtMs(nowMs);
  const delay = Math.max(1000, Math.min(MAX_TIMEOUT_MS, nextAt - nowMs));
  timer = setTimeout(() => {
    void tickWorldSprayWeeklyReset();
  }, delay);
}

async function tickWorldSprayWeeklyReset(): Promise<void> {
  const now = Date.now();
  const lastRun = getWorldSprayLastWeeklyResetAtMs();
  if (shouldApplyWorldSprayWeeklyReset(now, lastRun)) {
    await applyWeeklyWipe(now, 'corte semanal');
  }
  armNext(Date.now());
}

/** Liga o wipe de pixos toda segunda 07:00 America/Sao_Paulo. */
export function startWorldSprayWeeklyResetScheduler(): void {
  if (started) return;
  started = true;
  armNext(Date.now());
}

export function stopWorldSprayWeeklyResetScheduler(): void {
  started = false;
  if (timer === null) return;
  clearTimeout(timer);
  timer = null;
}
