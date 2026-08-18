import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPvpRankedQueueManager,
  resetPvpRankedQueueManagerForTests,
  type PvpRankedMatchPair,
} from './PvpRankedQueueManager.js';
import { PVP_RANKED_ACCEPT_COUNTDOWN_MS } from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import type { PlayerSkinBundleId } from '../../../shared/character/playerSkinBundle.js';

const SKIN: PlayerSkinBundleId = 'player_male_1';

function member(
  connectionId: string,
  playerId: string,
  characterId: number,
  displayName: string,
) {
  return { connectionId, playerId, characterId, displayName, skinBundleId: SKIN };
}

describe('PvpRankedQueueManager 1x1', () => {
  afterEach(() => {
    vi.useRealTimers();
    getPvpRankedQueueManager().clearAfterBattle();
    resetPvpRankedQueueManagerForTests();
  });

  it('dois personagens ocupam os slots; o terceiro é recusado', () => {
    const queue = getPvpRankedQueueManager();
    const a = queue.join(member('c-a', 'user-a', 1, 'Alpha'));
    const b = queue.join(member('c-b', 'user-b', 2, 'Bravo'));
    const extra = queue.join(member('c-c', 'user-c', 3, 'Charlie'));

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.reason).toBe('STATION_FULL');
    expect(queue.getSnapshot().slots[0]?.displayName).toBe('Alpha');
    expect(queue.getSnapshot().slots[1]?.displayName).toBe('Bravo');
    expect(queue.getSnapshot().phase).toBe('waiting');
  });

  it('mesmo playerId com characterId diferente ocupa o outro slot', () => {
    const queue = getPvpRankedQueueManager();
    expect(queue.join(member('c-1', 'same-user', 1, 'Slot1')).ok).toBe(true);
    expect(queue.join(member('c-2', 'same-user', 2, 'Slot2')).ok).toBe(true);
    const snap = queue.getSnapshot();
    expect(snap.slots[0]?.characterId).toBe(1);
    expect(snap.slots[1]?.characterId).toBe(2);
  });

  it('aceite mútuo dispara match após o countdown', () => {
    vi.useFakeTimers();
    const queue = getPvpRankedQueueManager();
    const matches: PvpRankedMatchPair[] = [];
    queue.onMatchReady((match) => {
      matches.push(match);
    });

    queue.join(member('c-a', 'user-a', 1, 'Alpha'));
    queue.join(member('c-b', 'user-b', 2, 'Bravo'));
    expect(queue.setReady('c-a', true).ok).toBe(true);
    expect(queue.getSnapshot().phase).toBe('waiting');
    expect(queue.setReady('c-b', true).ok).toBe(true);
    expect(queue.getSnapshot().phase).toBe('countdown');

    vi.advanceTimersByTime(PVP_RANKED_ACCEPT_COUNTDOWN_MS);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.peers[0]?.playerId).toBe('user-a');
    expect(matches[0]?.peers[1]?.playerId).toBe('user-b');
    expect(queue.getSnapshot().phase).toBe('starting');
  });

  it('sair de um slot cancela a sessão inteira (1x1 exclusivo)', () => {
    const queue = getPvpRankedQueueManager();
    queue.join(member('c-a', 'user-a', 1, 'Alpha'));
    queue.join(member('c-b', 'user-b', 2, 'Bravo'));
    queue.leave('c-a');
    const snap = queue.getSnapshot();
    expect(snap.phase).toBe('idle');
    expect(snap.slots[0]).toBeNull();
    expect(snap.slots[1]).toBeNull();
  });

  it('ready exige a mesma aposta nos dois slots', () => {
    const queue = getPvpRankedQueueManager();
    queue.join({ ...member('c-a', 'user-a', 1, 'Alpha'), stakeVolts: 100 });
    queue.join({ ...member('c-b', 'user-b', 2, 'Bravo'), stakeVolts: 50 });
    expect(queue.setReady('c-a', true).ok).toBe(false);
    queue.setStake('c-b', 100);
    expect(queue.setReady('c-a', true).ok).toBe(true);
    expect(queue.setReady('c-b', true).ok).toBe(true);
    expect(queue.getSnapshot().potVolts).toBe(200);
  });
});
