// @ts-nocheck
import { moveIdsToSkillData, resolvePlayerEquippedSkillIds, } from '../../shared/combat/movesetLoadout.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
/**
 * Espelha o loadout confirmado para a camada de combate.
 * Atualizado via LOADOUT_SAVED emitido pelo GlobalPlayerStore.
 */
class BattleStore {
    activeMovesets = [];
    unsubscribe = null;
    resolveClassId() {
        return getPlayerEquipmentStore().getSnapshot().classId;
    }
    syncFromConfirmed() {
        const classId = this.resolveClassId();
        const confirmed = getGlobalPlayerStore().getConfirmedLoadout();
        this.activeMovesets = resolvePlayerEquippedSkillIds(classId, confirmed);
    }
    attach() {
        if (this.unsubscribe)
            return;
        this.syncFromConfirmed();
        this.unsubscribe = uiEvents.on(UIEventType.LOADOUT_SAVED, ({ activeMovesets }) => {
            const classId = this.resolveClassId();
            this.activeMovesets = resolvePlayerEquippedSkillIds(classId, activeMovesets);
        });
    }
    /** Re-sincroniza após troca de classe / applyClassMoveset no enterWorld. */
    resyncLoadout() {
        this.syncFromConfirmed();
    }
    detach() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.activeMovesets = [];
    }
    getActiveMovesets() {
        return [...this.activeMovesets];
    }
    getPlayerBattleSkills() {
        const classId = this.resolveClassId();
        const ids = resolvePlayerEquippedSkillIds(classId, this.activeMovesets);
        const { movesetMastery } = getPlayerProgressionStore().getSnapshot();
        return moveIdsToSkillData(ids, movesetMastery);
    }
}
let store = null;
export function getBattleStore() {
    if (!store)
        store = new BattleStore();
    return store;
}
export function initBattleStore() {
    const active = getBattleStore();
    active.attach();
    return active;
}
export function resetBattleStore() {
    store?.detach();
    store = null;
}
