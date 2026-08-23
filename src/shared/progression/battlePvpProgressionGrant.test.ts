import { describe, expect, it } from 'vitest';
import { resolvePvpBattleProgressionGrant } from '../progression/battleProgressionGrant.js';

describe('resolvePvpBattleProgressionGrant', () => {
  it('vitória: pool nerfado do oponente; sem marco', () => {
    const grant = resolvePvpBattleProgressionGrant({
      victory: true,
      selfLevel: 50,
      opponentLevel: 30,
      movesUsedInBattle: ['IMP_1', 'IMP_1'],
    });
    expect(grant.totalBattleXp).toBe(Math.floor(315 * 0.5));
    expect(grant.levelXp).toBeGreaterThan(0);
    expect(grant.milestoneProgressGain).toBe(0);
    expect(grant.creatureId).toBeNull();
  });

  it('derrota KO: 40% do pool do vencedor (já nerfado)', () => {
    const win = resolvePvpBattleProgressionGrant({
      victory: true,
      selfLevel: 50,
      opponentLevel: 30,
    });
    const loss = resolvePvpBattleProgressionGrant({
      victory: false,
      selfLevel: 30,
      opponentLevel: 50,
    });
    expect(loss.totalBattleXp).toBe(Math.floor(win.totalBattleXp * 0.4));
    expect(loss.milestoneProgressGain).toBe(0);
  });

  it('FORFEIT: zero', () => {
    const grant = resolvePvpBattleProgressionGrant({
      victory: true,
      endReason: 'FORFEIT',
      selfLevel: 20,
      opponentLevel: 20,
    });
    expect(grant.totalBattleXp).toBe(0);
  });
});
