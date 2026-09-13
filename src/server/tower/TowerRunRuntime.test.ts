import { describe, expect, it } from 'vitest';
import {
    createTowerParty,
    enterTowerFloor1,
    getTowerPartyForPlayer,
    inviteToTowerParty,
    setTowerPartyReady,
    unlockTowerEntry,
} from './TowerRunRuntime.js';

describe('TowerRunRuntime', () => {
    it('permite entrada solo e avança para o andar 1 após liberar o spawn', () => {
        const created = createTowerParty('solo-player', 1, 'Solo', 10);
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const unlocked = unlockTowerEntry('solo-player');
        expect(unlocked.ok).toBe(true);
        if (!unlocked.ok) return;

        const entered = enterTowerFloor1('solo-player');
        expect(entered.ok).toBe(true);
        if (!entered.ok) return;

        expect(entered.mapId).toBe('tower_floor_1');
        expect(getTowerPartyForPlayer('solo-player')?.floorIndex).toBe(1);
    });

    it('bloqueia liberar entrada em party multi quando alguém ainda não confirmou Pronto', () => {
        const created = createTowerParty('leader-player', 10, 'Líder', 10);
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const invited = inviteToTowerParty(
            'leader-player',
            'guest-player',
            11,
            'Convidado',
            10,
        );
        expect(invited.ok).toBe(true);
        if (!invited.ok) return;

        const blocked = unlockTowerEntry('leader-player');
        expect(blocked.ok).toBe(false);
        if (blocked.ok) return;
        expect(blocked.error).toBe('NOT_ALL_READY');

        const markedReady = setTowerPartyReady('guest-player', true);
        expect(markedReady.ok).toBe(true);
        if (!markedReady.ok) return;

        const unlocked = unlockTowerEntry('leader-player');
        expect(unlocked.ok).toBe(true);
        if (!unlocked.ok) return;

        expect(unlocked.party.members.every((member) => member.ready)).toBe(true);
    });
});
