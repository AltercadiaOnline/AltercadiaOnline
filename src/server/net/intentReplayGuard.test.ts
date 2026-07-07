import { afterEach, describe, expect, it } from 'vitest';
import {
  acceptClientIntent,
  resetIntentReplayGuard,
} from './intentReplayGuard.js';

describe('acceptClientIntent', () => {
  afterEach(() => {
    resetIntentReplayGuard();
  });

  it('aceita primeira intenção com intentId único', () => {
    const now = 1_700_000_000_000;
    const result = acceptClientIntent('player-1', 42, {
      intentId: 'intent-a',
      timestamp: now,
    }, now);

    expect(result).toEqual({ ok: true });
  });

  it('bloqueia replay do mesmo intentId na sessão', () => {
    const now = 1_700_000_000_000;
    const intent = { intentId: 'intent-replay', timestamp: now };

    expect(acceptClientIntent('player-1', 42, intent, now)).toEqual({ ok: true });
    expect(acceptClientIntent('player-1', 42, intent, now)).toEqual({
      ok: false,
      code: 'REPLAY_DETECTED',
      message: 'Intenção já processada.',
    });
  });

  it('permite mesmo intentId em sessões diferentes', () => {
    const now = 1_700_000_000_000;
    const intent = { intentId: 'shared-id', timestamp: now };

    expect(acceptClientIntent('player-1', 1, intent, now)).toEqual({ ok: true });
    expect(acceptClientIntent('player-2', 1, intent, now)).toEqual({ ok: true });
  });
});
