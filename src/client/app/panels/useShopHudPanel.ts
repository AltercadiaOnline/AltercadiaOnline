// @ts-nocheck
import { useEffect, useState } from 'react';
import { SKIN_SHOP_CATALOG } from '../../../shared/character/skinShopCatalog.js';
import { SKIN_SLOT_LABELS } from '../../../shared/character/playerSkin.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerSkinStore } from '../../ui/character/playerSkinStore.js';
function buildView() {
    const skinStore = getPlayerSkinStore();
    const wallet = getDataStore().getWallet();
    return {
        walletFormatted: wallet.voltsFormatted,
        items: SKIN_SHOP_CATALOG.map((item) => ({
            slot: item.slot,
            optionId: item.optionId,
            name: item.name,
            accent: item.accent,
            slotLabel: SKIN_SLOT_LABELS[item.slot],
            priceLabel: formatVolts(item.price),
            owned: skinStore.isOwned(item.slot, item.optionId),
        })),
    };
}
export function useShopHudPanel(enabled) {
    const [view, setView] = useState(() => buildView());
    useEffect(() => {
        if (!enabled)
            return;
        const dataStore = getDataStore();
        const refresh = () => setView(buildView());
        refresh();
        const unsubWallet = dataStore.subscribe('wallet', refresh);
        const unsubSkin = getPlayerSkinStore().subscribe(refresh);
        return () => {
            unsubWallet();
            unsubSkin();
        };
    }, [enabled]);
    const purchaseSkin = (slot, optionId) => {
        const result = getActionDispatcher().dispatch({
            type: 'PURCHASE_SKIN',
            payload: { slot, optionId },
        });
        if (result.ok)
            setView(buildView());
        return result.ok;
    };
    return { view, purchaseSkin };
}
