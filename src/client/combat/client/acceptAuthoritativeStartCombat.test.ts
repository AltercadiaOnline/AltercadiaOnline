import { describe, expect, it } from 'vitest';
import { shouldAcceptAuthoritativeStartCombat } from './acceptAuthoritativeStartCombat.js';

describe('shouldAcceptAuthoritativeStartCombat', () => {
  const exploring = {
    pendingPveJoin: false,
    inExploration: true,
    transitioning: false,
    inBattle: false,
  };

  it('rejeita START_COMBAT PVE órfão em exploração', () => {
    expect(shouldAcceptAuthoritativeStartCombat(exploring)).toBe(false);
  });

  it('aceita PVE com join pendente', () => {
    expect(shouldAcceptAuthoritativeStartCombat({
      ...exploring,
      pendingPveJoin: true,
    })).toBe(true);
  });

  it('aceita PVP rankeado ainda em exploração (fila do púlpito)', () => {
    expect(shouldAcceptAuthoritativeStartCombat({
      ...exploring,
      battleType: 'PVP',
      matchId: 'match-1',
    })).toBe(true);
  });

  it('aceita PVP só com matchId', () => {
    expect(shouldAcceptAuthoritativeStartCombat({
      ...exploring,
      matchId: 'match-1',
    })).toBe(true);
  });
});
