import { describe, expect, it } from 'vitest';
import { nextCharacterId, nextMonotonicCharacterId } from './characterCreation.js';

describe('nextCharacterId', () => {
  it('começa em 1 quando a conta está vazia', () => {
    expect(nextCharacterId([])).toBe(1);
  });

  it('usa o maior id vivo + 1', () => {
    expect(nextCharacterId([1, 3])).toBe(4);
  });
});

describe('nextMonotonicCharacterId', () => {
  it('não recicla o id depois do delete (live vazio, teto 1)', () => {
    expect(nextMonotonicCharacterId([], 1)).toBe(2);
  });

  it('reserva leftover de arquivo mesmo sem seq', () => {
    expect(nextMonotonicCharacterId([1], 0)).toBe(2);
  });

  it('avança além do maior entre vivos, leftover e seq', () => {
    expect(nextMonotonicCharacterId([1, 2], 5)).toBe(6);
  });
});
