import { describe, expect, it } from 'vitest';
import { resolveHubSlotLevel } from './resolveHubSlotLevel.js';

describe('resolveHubSlotLevel', () => {
  it('sem save em disco: espelha profiles.level (não o default RAM 1)', () => {
    expect(resolveHubSlotLevel(false, 1, 12)).toBe(12);
    expect(resolveHubSlotLevel(false, undefined, 7)).toBe(7);
  });

  it('com save em disco: prefere nível do arquivo/progressão', () => {
    expect(resolveHubSlotLevel(true, 8, 3)).toBe(8);
    expect(resolveHubSlotLevel(true, 1, 99)).toBe(1);
  });

  it('fallback seguro quando ambos ausentes', () => {
    expect(resolveHubSlotLevel(false, undefined, undefined)).toBe(1);
    expect(resolveHubSlotLevel(true, undefined, 5)).toBe(5);
  });
});
