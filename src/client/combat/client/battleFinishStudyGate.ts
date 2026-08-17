import { useBattleHudStore } from '../../app/battle/battleHudStore.js';
import {
  BATTLE_FINISH_STUDY_HOLD_MS,
  shouldSkipBattleFinishStudy,
} from './battleFinishFlow.js';
import type { BattleEndReason } from '../../../shared/combat/battleEnded.js';

export type BattleFinishStudyResult = 'confirmed' | 'cancelled' | 'skipped';

type BattleFinishStudyRuntime = {
  studyPending: boolean;
  holdTimer: ReturnType<typeof setTimeout> | null;
  waitResolve: ((result: BattleFinishStudyResult) => void) | null;
};

function getRuntime(): BattleFinishStudyRuntime {
  const g = globalThis as typeof globalThis & {
    __ALTERCADIA_BATTLE_FINISH_STUDY_GATE__?: BattleFinishStudyRuntime;
  };
  if (!g.__ALTERCADIA_BATTLE_FINISH_STUDY_GATE__) {
    g.__ALTERCADIA_BATTLE_FINISH_STUDY_GATE__ = {
      studyPending: false,
      holdTimer: null,
      waitResolve: null,
    };
  }
  return g.__ALTERCADIA_BATTLE_FINISH_STUDY_GATE__;
}

export function isBattleFinishStudyPending(): boolean {
  return getRuntime().studyPending;
}

function clearHoldTimer(): void {
  const runtime = getRuntime();
  if (runtime.holdTimer === null) return;
  clearTimeout(runtime.holdTimer);
  runtime.holdTimer = null;
}

function settle(result: BattleFinishStudyResult): void {
  const runtime = getRuntime();
  runtime.studyPending = false;
  clearHoldTimer();
  useBattleHudStore.getState().hideFinishPrompt();
  const resolve = runtime.waitResolve;
  runtime.waitResolve = null;
  resolve?.(result);
}

/** Cancela o hold/prompt (nova batalha, saída, fuga). */
export function dismissBattleFinishStudyGate(): void {
  const runtime = getRuntime();
  if (!runtime.studyPending && !runtime.waitResolve) {
    useBattleHudStore.getState().hideFinishPrompt();
    return;
  }
  settle('cancelled');
}

/** Jogador confirmou o mini HUD — segue para a tela de vitória/derrota. */
export function confirmBattleFinishStudyGate(): void {
  if (!getRuntime().waitResolve) return;
  settle('confirmed');
}

/**
 * Hold do hit final + botão Finalizar. Fuga (FORFEIT) pula o passo.
 */
export async function runBattleFinishStudyGate(options: {
  readonly victory: boolean;
  readonly endReason?: BattleEndReason;
}): Promise<BattleFinishStudyResult> {
  if (shouldSkipBattleFinishStudy(options.endReason)) {
    return 'skipped';
  }

  dismissBattleFinishStudyGate();
  const runtime = getRuntime();
  runtime.studyPending = true;

  const holdOutcome = await new Promise<BattleFinishStudyResult | 'held'>((resolve) => {
    runtime.waitResolve = (result) => resolve(result);
    runtime.holdTimer = setTimeout(() => {
      runtime.holdTimer = null;
      resolve('held');
    }, BATTLE_FINISH_STUDY_HOLD_MS);
  });

  if (holdOutcome !== 'held') {
    return holdOutcome;
  }
  runtime.waitResolve = null;
  if (!runtime.studyPending) {
    return 'cancelled';
  }

  useBattleHudStore.getState().showFinishPrompt(options.victory);

  return new Promise<BattleFinishStudyResult>((resolve) => {
    runtime.waitResolve = resolve;
  });
}
