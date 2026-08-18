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

  it('vencedor leva o pote; perdedor perde a aposta', async () => {
    applyAuthoritativeWalletBalances(winner.playerId, winner.characterId, 300, 0);
    applyAuthoritativeWalletBalances(loser.playerId, loser.characterId, 300, 0);
    expect((await lockPvpRankedDuelStake(winner, 100)).ok).toBe(true);
    expect((await lockPvpRankedDuelStake(loser, 100)).ok).toBe(true);

    const settled = await settlePvpRankedDuelStake({
      winner,
      loser,
      stakeVolts: 100,
    });
    expect(settled.ok).toBe(true);
    expect(getPlayerWallet(winner.playerId, winner.characterId)).toMatchObject({
      dollarVolt: 400,
      lockedDollarVolt: 0,
    });
    expect(getPlayerWallet(loser.playerId, loser.characterId)).toMatchObject({
      dollarVolt: 200,
      lockedDollarVolt: 0,
    });
  });

  it('vitória contra bot de prática credita o equivalente da aposta', async () => {
    applyAuthoritativeWalletBalances(winner.playerId, winner.characterId, 200, 0);
    expect((await lockPvpRankedDuelStake(winner, 50)).ok).toBe(true);
    const settled = await settlePvpRankedDuelStake({
      winner,
      loser: { playerId: 'pvp_practice_bot', characterId: 0 },
      stakeVolts: 50,
    });
    expect(settled.ok).toBe(true);
    expect(getPlayerWallet(winner.playerId, winner.characterId)).toMatchObject({
      dollarVolt: 250,
      lockedDollarVolt: 0,
    });
  });
});
