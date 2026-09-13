import { describe, expect, it } from 'vitest';
import { getResolvedNpcRegistry } from './npcRegistry.js';

describe('npcRegistry', () => {
    it('does not register tower entry spawn as an interactable NPC', () => {
        const spawn = getResolvedNpcRegistry().find(
            (npc) => npc.id.startsWith('enter_spaw_towerpower')
                || npc.id.startsWith('enter_spaw_towerpower#'),
        );

        expect(spawn).toBeUndefined();
    });
});
