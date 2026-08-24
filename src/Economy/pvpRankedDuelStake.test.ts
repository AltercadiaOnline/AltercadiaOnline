import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAuthoritativeWalletBalances,
  getPlayerWallet,
  resetEconomyStore,
} from './economyStore.js';
import {
  lockPvpRankedDuelStake,
  settlePvpRankedDuelStake,
  unlockPvpRankedDuelStake,
} from './economyGateway.js';

const winner = { playerId: 'user-win', characterId: 1 };
const loser = { playerId: 'user-lose', characterId: 2 };

afterEach(() => {
  resetEconomyStore();
});

describe('aposta PVP 1x1 via economyGateway', () => {
  it('trava, devolve na fila e não gasta VOLTS', async () => {
    applyAuthoritativeWalletBalances(winner.playerId, winner.characterId, 400, 0);
    expect((await lockPvpRankedDuelStake(winner, 100)).ok).toBe(true);
    expect(getPlayerWallet(winner.playerId, winner.characterId).lockedDollarVolt).toBe(100);
    expect(getPlayerWallet(winner.playerId, winner.characterId).dollarVolt).toBe(400);
    expect((await unlockPvpRankedDuelStake(winner, 100)).ok).toBe(true);
    expect(getPlayerWallet(winner.playerId, winner.characterId).lockedDollarVolt).toBe(0);
    expect(getPlayerWallet(winner.playerId, winner.characterId).dollarVolt).toBe(400);
  });

  it('vencedor leva o pote menos 5%; apostas podem divergir', async () => {
    applyAuthoritativeWalletBalances(winner.playerId, winner.characterId, 300, 0);
    applyAuthoritativeWalletBalances(loser.playerId, loser.characterId, 1200, 0);
    expect((await lockPvpRankedDuelStake(winner, 50)).ok).toBe(true);
    expect((await lockPvpRankedDuelStake(loser, 1000)).ok).toBe(true);

    const settled = await settlePvpRankedDuelStake({
      winner,
      loser,
      winnerStakeVolts: 50,
      loserStakeVolts: 1000,
    });
    expect(settled.ok).toBe(true);
    // pote 1050, rake 53, payout 997. Winner started 300: -50 locked spend +997 = 1247
    expect(getPlayerWallet(winner.playerId, winner.characterId)).toMatchObject({
      dollarVolt: 1247,
      lockedDollarVolt: 0,
    });
    expect(getPlayerWallet(loser.playerId, loser.characterId)).toMatchObject({
      dollarVolt: 200,
      lockedDollarVolt: 0,
    });
  });
});
