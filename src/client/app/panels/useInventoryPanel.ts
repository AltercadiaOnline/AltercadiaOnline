// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { subscribeGameStore } from '../../state/GameStore.js';
import { isSyncPending, selectPlayerGold, selectPlayerInventory, } from '../../services/index.js';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
function buildView() {
    const inventory = selectPlayerInventory();
    return {
        used: inventory.used,
        capacity: inventory.capacity,
        slots: inventory.slots,
        wallet: selectPlayerGold(),
        syncPending: isSyncPending(),
        npcVendorOpen: isNpcVendorShopOpen(),
    };
}
export function useInventoryPanel(enabled) {
    const [view, setView] = useState(() => buildView());
    const refresh = useCallback(() => {
        setView(buildView());
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        const unsubscribers = [
            subscribeGameStore((_, slice) => {
                if (slice === 'player' || slice === 'pendingActions' || slice === '*') {
                    refresh();
                }
            }),
            subscribeNpcVendorShopOpen(() => refresh()),
        ];
        refresh();
        return () => {
            for (const off of unsubscribers) {
                off();
            }
        };
    }, [enabled, refresh]);
    return view;
}
