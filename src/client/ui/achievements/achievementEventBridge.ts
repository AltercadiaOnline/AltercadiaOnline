// @ts-nocheck
/**
 * Desbloqueia conquistas a partir dos mesmos eventos de jogo (espelho local).
 * Persistência autoritativa online pode migrar depois via sync — UI já lê a store.
 */
import { uiEvents, UIEventType } from '../uiEvents.js';
import { getPlayerAchievementStore } from './playerAchievementStore.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerPetStore } from '../pet/playerPetStore.js';
export function initAchievementEventBridge() {
    const store = getPlayerAchievementStore();
    const offs = [
        uiEvents.on(UIEventType.BATTLE_FINISHED, (payload) => {
            if (!payload.victory)
                return;
            store.unlock('first_pve_victory');
            store.bumpCounter('pve_victories', 1);
        }),
        uiEvents.on(UIEventType.MARCO_CHOSEN, () => {
            store.unlock('first_marco');
        }),
        uiEvents.on(UIEventType.PET_MEMORIAL_CREATED, () => {
            store.unlock('pet_memorial');
        }),
    ];
    const unsubPet = getPlayerPetStore().subscribeRoster(() => {
        const roster = getPlayerPetStore().getRoster();
        if (roster.pets.length > 0 || getPlayerPetStore().getSnapshot()) {
            store.unlock('first_pet_summon');
        }
    });
    let unsubWallet = null;
    try {
        unsubWallet = getDataStore().subscribe('wallet', (wallet) => {
            if (wallet.dollarVolt > 0) {
                store.unlock('wallet_first_volt');
            }
        });
    }
    catch {
        /* Economy ainda não pronta (ex.: mock async em GAME_MODE=local). */
    }
    // Hidratação imediata (save já com pet/volts).
    const roster = getPlayerPetStore().getRoster();
    if (roster.pets.length > 0 || getPlayerPetStore().getSnapshot()) {
        store.unlock('first_pet_summon');
    }
    try {
        const wallet = getDataStore().getWallet();
        if (wallet.dollarVolt > 0) {
            store.unlock('wallet_first_volt');
        }
    }
    catch {
        /* ignore */
    }
    return () => {
        for (const off of offs)
            off();
        unsubPet();
        unsubWallet?.();
    };
}
