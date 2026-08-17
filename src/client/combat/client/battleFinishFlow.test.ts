import { describe, expect, it } from 'vitest';
import { shouldSkipBattleFinishStudy } from './battleFinishFlow.js';

describe('shouldSkipBattleFinishStudy', () => {
  it('pula o estudo só na fuga', () => {
    expect(shouldSkipBattleFinishStudy('FORFEIT')).toBe(true);
    expect(shouldSkipBattleFinishStudy('VICTORY')).toBe(false);
    expect(shouldSkipBattleFinishStudy('DEFEAT')).toBe(false);
    expect(shouldSkipBattleFinishStudy(undefined)).toBe(false);
  });
});
