import { describe, expect, it } from 'vitest';
import {
  INTENT_MAX_AGE_MS,
  INTENT_MAX_CLOCK_SKEW_MS,
  validateIntentTimestamp,
} from './clientIntent.js';

describe('validateIntentTimestamp', () => {
  const now = 1_700_000_000_000;

  it('aceita timestamp dentro da janela', () => {
    expect(validateIntentTimestamp(now - 1_000, now)).toEqual({ ok: true });
  });

  it('rejeita intent expirada', () => {
    expect(validateIntentTimestamp(now - INTENT_MAX_AGE_MS - 1, now)).toEqual({
      ok: false,
      code: 'STALE_INTENT',
    });
  });

  it('rejeita relógio adiantado demais', () => {
    expect(validateIntentTimestamp(now + INTENT_MAX_CLOCK_SKEW_MS + 1, now)).toEqual({
      ok: false,
      code: 'FUTURE_INTENT',
    });
  });

  it('rejeita timestamp inválido', () => {
    expect(validateIntentTimestamp(Number.NaN, now)).toEqual({
      ok: false,
      code: 'INVALID_TIMESTAMP',
    });
  });
});
