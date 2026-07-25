// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALQUIMISTA_NPC } from '../../../shared/world/npcBuildingAnchors.js';
import { findNpcVendorListing, } from '../../../shared/economy/npcVendorCatalog.js';
import { resolveNpcPurchaseQuote, } from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { buildLaboratoryShopBodyHtml, clampLabPurchaseQuantity, } from '../../ui/vendor/renderLaboratoryShopView.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
const DEFAULT_VENDOR = {
    vendorId: ALQUIMISTA_NPC,
    vendorName: 'Alquimista',
};
export function useLaboratoryShopPanel(enabled) {
    const [vendor, setVendor] = useState(DEFAULT_VENDOR);
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [inventory, setInventory] = useState(() => getDataStore().getInventory());
    const [activeTab, setActiveTab] = useState('potions');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [purchaseQuantity, setPurchaseQuantity] = useState(1);
    const bodyRef = useRef(null);
    const viewModel = useMemo(() => {
        const listing = selectedItemId
            ? findNpcVendorListing(vendor.vendorId, selectedItemId)
            : null;
        const clampedQty = listing
            ? clampLabPurchaseQuantity(listing, inventory, wallet.dollarVolt, purchaseQuantity)
            : purchaseQuantity;
        return {
            vendor,
            wallet,
            inventory,
            activeTab,
            selectedItemId,
            purchaseQuantity: clampedQty,
        };
    }, [vendor, wallet, inventory, activeTab, selectedItemId, purchaseQuantity]);
    const bodyHtml = useMemo(() => buildLaboratoryShopBodyHtml(viewModel), [viewModel]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.laboratoryShop) {
                setVendor({ ...snapshot.laboratoryShop });
                setActiveTab('potions');
                setSelectedItemId(null);
                setPurchaseQuantity(1);
            }
        });
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        setWallet(getDataStore().getWallet());
        setInventory(getDataStore().getInventory());
        const unsubWallet = getDataStore().subscribe('wallet', setWallet);
        const unsubInventory = getDataStore().subscribe('inventory', setInventory);
        return () => {
            unsubWallet();
            unsubInventory();
        };
    }, [enabled]);
    const dispatchPurchase = useCallback(() => {
        if (!selectedItemId)
            return;
        const listing = findNpcVendorListing(vendor.vendorId, selectedItemId);
        if (!listing)
            return;
        const quantity = clampLabPurchaseQuantity(listing, inventory, wallet.dollarVolt, purchaseQuantity);
        const result = getActionDispatcher().dispatch({
            type: 'PURCHASE_NPC_ITEM',
            payload: {
                vendorId: vendor.vendorId,
                itemId: selectedItemId,
                quantity,
            },
        });
        if (!result.ok) {
            alertSystem(result.reason);
            return;
        }
        if (result.status === 'applied') {
            setPurchaseQuantity(1);
        }
    }, [inventory, purchaseQuantity, selectedItemId, vendor.vendorId, wallet.dollarVolt]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        const tabBtn = target.closest('[data-lab-tab]');
        if (tabBtn) {
            const tab = tabBtn.dataset.labTab;
            if (tab && tab !== activeTab) {
                setActiveTab(tab);
                setSelectedItemId(null);
                setPurchaseQuantity(1);
            }
            return;
        }
        const row = target.closest('[data-select-lab-item]');
        if (row) {
            setSelectedItemId(row.dataset.selectLabItem ?? null);
            setPurchaseQuantity(1);
            return;
        }
        const presetBtn = target.closest('[data-lab-qty-preset]');
        if (presetBtn && selectedItemId) {
            const listing = findNpcVendorListing(vendor.vendorId, selectedItemId);
            if (!listing)
                return;
            const preset = Math.max(1, Number(presetBtn.dataset.labQtyPreset) || 1);
            setPurchaseQuantity(clampLabPurchaseQuantity(listing, inventory, wallet.dollarVolt, preset));
            return;
        }
        if (target.dataset.action === 'confirm-purchase') {
            dispatchPurchase();
        }
    }, [activeTab, dispatchPurchase, inventory, selectedItemId, vendor.vendorId, wallet.dollarVolt]);
    const handleInput = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !selectedItemId)
            return;
        const listing = findNpcVendorListing(vendor.vendorId, selectedItemId);
        if (!listing)
            return;
        if (target.matches('[data-lab-qty], [data-lab-qty-slider]')) {
            const next = clampLabPurchaseQuantity(listing, inventory, wallet.dollarVolt, Math.max(1, Math.floor(Number(target.value) || 1)));
            setPurchaseQuantity(next);
            const quote = resolveNpcPurchaseQuote(listing, next);
            const totalEl = bodyRef.current?.querySelector('[data-lab-buy-total]');
            if (totalEl && quote) {
                totalEl.textContent = formatVoltsShort(quote.totalVolts);
            }
            const buyBtn = bodyRef.current?.querySelector('[data-action="confirm-purchase"]');
            if (buyBtn) {
                buyBtn.disabled = wallet.dollarVolt < (quote?.totalVolts ?? 0);
            }
        }
    }, [inventory, selectedItemId, vendor.vendorId, wallet.dollarVolt]);
    return {
        vendor,
        bodyHtml,
        bodyRef,
        handleClick,
        handleInput,
    };
}
