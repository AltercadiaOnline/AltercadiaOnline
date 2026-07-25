// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import { EQUIPMENT_UI_SLOT_LABELS, EQUIPMENT_UI_SLOT_ORDER, } from '../../../shared/character/equipmentUiSlots.js';
import { resolveCharacterLevelXpBar, } from '../../../shared/character/characterLevelProgression.js';
import { resolveLoadoutPpBudget } from '../../../shared/combat/loadoutPpBudget.js';
import { getCarryCapacityStore, } from '../../ui/capacity/carryCapacityStore.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { isSyncPending, selectPlayerEquipment } from '../../services/index.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import { clearEquipmentSidebarHud, registerEquipmentSidebarHud, } from './equipmentSidebarRegistry.js';
function buildView(xpBarOverride) {
    const equipment = getPlayerEquipmentStore().getSnapshot();
    const profile = getPlayerProfileStore().getSnapshot();
    const capacity = getCarryCapacityStore().getSnapshot();
    const equippedItems = selectPlayerEquipment();
    const displayStore = getPlayerEquipmentStore();
    const { ppCurrent, ppMax } = resolveLoadoutPpBudget(getGlobalPlayerStore().getConfirmedLoadout());
    const slots = EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
        const row = equippedItems.find((item) => item.slot === slotId);
        const itemId = row?.itemId ?? null;
        return {
            slotId,
            label: EQUIPMENT_UI_SLOT_LABELS[slotId],
            itemId,
            displayName: itemId ? displayStore.getItemDisplayName(itemId) : null,
        };
    });
    return {
        displayName: equipment.displayName,
        level: equipment.level,
        profile,
        xpBar: xpBarOverride ?? resolveCharacterLevelXpBar(profile.level, profile.xpCurrent),
        vitals: equipment.vitals,
        ppCurrent,
        ppMax,
        capacity,
        slots,
        syncPending: isSyncPending(),
    };
}
export function useEquipmentSidebar() {
    const xpBarOverrideRef = useRef(null);
    const [view, setView] = useState(() => buildView(null));
    const refresh = useCallback(() => {
        setView(buildView(xpBarOverrideRef.current));
    }, []);
    useEffect(() => {
        registerEquipmentSidebarHud({
            refreshLevelXpBar: (profile, barView) => {
                xpBarOverrideRef.current = barView ?? resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
                refresh();
            },
        });
        const unsubscribers = [
            getPlayerEquipmentStore().subscribe(() => refresh()),
            getPlayerProfileStore().subscribe(() => refresh()),
            getCarryCapacityStore().subscribe(() => refresh()),
            getGlobalPlayerStore().subscribe(() => refresh()),
            subscribeGameStore((_, slice) => {
                if (slice === 'player' || slice === 'pendingActions' || slice === '*') {
                    refresh();
                }
            }),
        ];
        refresh();
        return () => {
            for (const off of unsubscribers) {
                off();
            }
            clearEquipmentSidebarHud();
        };
    }, [refresh]);
    return view;
}
