// @ts-nocheck
import { useEffect, useState } from 'react';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerMarketStore } from '../../ui/market/playerMarketStore.js';
import { alertSystem } from '../../ui/alertSystem.js';
function buildListings() {
    return getPlayerMarketStore().getListings().map((entry) => ({
        id: entry.id,
        itemId: entry.itemId,
        itemName: entry.itemName,
        quantity: entry.quantity,
        status: entry.status,
        statusLabel: entry.status === 'LISTED' ? 'À Venda' : 'Vendido',
        priceLabel: formatVolts(entry.totalPriceVolts),
        canCollect: entry.status === 'SOLD',
    }));
}
export function useMarketHubPanel(enabled) {
    const [listings, setListings] = useState(() => buildListings());
    useEffect(() => {
        if (!enabled)
            return;
        setListings(buildListings());
        return getPlayerMarketStore().subscribe((next) => {
            setListings(next.map((entry) => ({
                id: entry.id,
                itemId: entry.itemId,
                itemName: entry.itemName,
                quantity: entry.quantity,
                status: entry.status,
                statusLabel: entry.status === 'LISTED' ? 'À Venda' : 'Vendido',
                priceLabel: formatVolts(entry.totalPriceVolts),
                canCollect: entry.status === 'SOLD',
            })));
        });
    }, [enabled]);
    const collectVolts = (listingId) => {
        const result = getActionDispatcher().dispatch({
            type: 'COLLECT_MARKET_VOLTS',
            payload: { listingId },
        });
        if (!result.ok)
            alertSystem(result.reason);
    };
    return { listings, collectVolts };
}
