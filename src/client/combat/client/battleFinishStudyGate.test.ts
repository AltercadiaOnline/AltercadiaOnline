import { afterEach, describe, expect, it, vi } from 'vitest';
import { BATTLE_FINISH_STUDY_HOLD_MS } from './battleFinishFlow.js';
import {
  confirmBattleFinishStudyGate,
  dismissBattleFinishStudyGate,
  isBattleFinishStudyPending,
  runBattleFinishStudyGate,
} from './battleFinishStudyGate.js';
import { useBattleHudStore } from '../../app/battle/battleHudStore.js';

describe('runBattleFinishStudyGate', () => {
  afterEach(() => {
    dismissBattleFinishStudyGate();
    vi.useRealTimers();
  });

  it('pula fuga sem abrir o prompt', async () => {
    await expect(runBattleFinishStudyGate({
      victory: false,
      endReason: 'FORFEIT',
    })).resolves.toBe('skipped');
    expect(isBattleFinishStudyPending()).toBe(false);
    expect(useBattleHudStore.getState().finishPromptVisible).toBe(false);
  });

  it('segura o hit final e só confirma no Finalizar', async () => {
    vi.useFakeTimers();
    const pending = runBattleFinishStudyGate({ victory: true, endReason: 'VICTORY' });
    expect(isBattleFinishStudyPending()).toBe(true);
    expect(useBattleHudStore.getState().finishPromptVisible).toBe(false);

    await vi.advanceTimersByTimeAsync(BATTLE_FINISH_STUDY_HOLD_MS);
    expect(useBattleHudStore.getState().finishPromptVisible).toBe(true);

    confirmBattleFinishStudyGate();
    await expect(pending).resolves.toBe('confirmed');
    expect(useBattleHudStore.getState().finishPromptVisible).toBe(false);
    expect(isBattleFinishStudyPending()).toBe(false);
  });
});
