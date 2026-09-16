import { describe, expect, it, beforeEach } from 'vitest';
import {
  __resetTowerRuntimeForTests,
  createTowerParty,
  enterTowerFloor1,
  getOccupyingPartyRunId,
  getTowerPartyForPlayer,
  inviteToTowerParty,
} from './TowerRunRuntime.js';

describe('TowerRunRuntime entry window', () => {
  beforeEach(() => {
    __resetTowerRuntimeForTests();
  });

  it('solo: 1º enter ocupa a torre e trava roster na hora', () => {
    const created = createTowerParty('solo-player', 1, 'Solo', 10);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const entered = enterTowerFloor1('solo-player');
    expect(entered.ok).toBe(true);
    if (!entered.ok) return;

    expect(entered.mapId).toBe('tower_floor_1');
    const party = getTowerPartyForPlayer('solo-player');
    expect(party?.floorIndex).toBe(1);
    expect(party?.rosterLocked).toBe(true);
    expect(party?.membersInRun.has('solo-player')).toBe(true);
    expect(getOccupyingPartyRunId()).toBe(party?.partyRunId);
  });

  it('multi: 1º enter abre janela; segundo entra na mesma run; outra party vê TOWER_BUSY', () => {
    const a = createTowerParty('leader-a', 10, 'Líder A', 10);
    expect(a.ok).toBe(true);
    if (!a.ok) return;

    const invited = inviteToTowerParty('leader-a', 'guest-a', 11, 'Guest A', 10);
    expect(invited.ok).toBe(true);

    const first = enterTowerFloor1('leader-a');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.party.rosterLocked).toBe(false);
    expect(first.party.entryWindowEndsAtServerMs).toBeTypeOf('number');

    const second = enterTowerFloor1('guest-a');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.party.rosterLocked).toBe(true);
    expect(second.party.membersInRun.size).toBe(2);

    const b = createTowerParty('leader-b', 20, 'Líder B', 10);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const busy = enterTowerFloor1('leader-b');
    expect(busy.ok).toBe(false);
    if (busy.ok) return;
    expect(busy.error).toBe('TOWER_BUSY');
  });
});
