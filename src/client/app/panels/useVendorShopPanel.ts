// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VENDEDOR_NPC } from '../../../shared/world/npcBuildingAnchors.js';
import { findNpcVendorListing, } from '../../../shared/economy/npcVendorCatalog.js';
import { resolveEffectiveNpcBuyUnitPrice, resolveEffectiveNpcSellUnitPrice, resolveInventoryItemSellQuote, resolveNpcPurchaseQuote, resolveNpcSellQuote, } from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { ActionGatewayButtonController, } from '../../ui/components/ActionGatewayButton.js';
import { setNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
import { buildVendorShopBodyHtml, clampVendorTradeQuantity, } from '../../ui/vendor/renderVendorShopView.js';
import { listInventorySellRows } from '../../ui/vendor/inventorySellRows.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
import { useActionGatewayAttach } from './useActionGatewayAttach.js';
const DEFAULT_VENDOR = {
    vendorId: VENDEDOR_NPC,
    vendorName: 'Vendedor',
};
export function useVendorShopPanel(enabled) {
    const [vendor, setVendor] = useState(DEFAULT_VENDOR);
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [inventory, setInventory] = useState(() => getDataStore().getInventory());
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [tradeMode, setTradeMode] = useState('catalog');
    const [tradeQuantity, setTradeQuantity] = useState(1);
    const [gatewayTick, setGatewayTick] = useState(0);
    const bodyRef = useRef(null);
    const purchaseGatewayRef = useRef(new ActionGatewayButtonController(() => buildPurchaseOptionsRef.current()));
    const sellGatewayRef = useRef(new ActionGatewayButtonController(() => buildSellOptionsRef.current()));
    const buildPurchaseOptionsRef = useRef(() => ({}));
    const buildSellOptionsRef = useRef(() => ({}));
    const clampedQuantity = useMemo(() => clampVendorTradeQuantity(inventory, tradeMode, selectedItemId, tradeQuantity), [inventory, tradeMode, selectedItemId, tradeQuantity]);
    const viewModel = useMemo(() => ({
        vendor,
        wallet,
        inventory,
        selectedItemId,
        tradeMode,
        tradeQuantity: clampedQuantity,
        gateway: {
            purchaseBusyAttrs: purchaseGatewayRef.current.busyAttrs(),
            sellBusyAttrs: sellGatewayRef.current.busyAttrs(),
        },
    }), [
        vendor,
        wallet,
        inventory,
        selectedItemId,
        tradeMode,
        clampedQuantity,
        gatewayTick,
    ]);
    const bodyHtml = useMemo(() => buildVendorShopBodyHtml(viewModel), [viewModel]);
    useEffect(() => {
        if (!enabled)
            return;
        setNpcVendorShopOpen(true);
        return () => setNpcVendorShopOpen(false);
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.vendorShop) {
                setVendor({ ...snapshot.vendorShop });
                setSelectedItemId(null);
                setTradeMode('catalog');
                setTradeQuantity(1);
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
    const bumpGateway = useCallback(() => {
        setGatewayTick((tick) => tick + 1);
    }, []);
    buildPurchaseOptionsRef.current = () => ({
        getLabelHtml: () => {
            if (!selectedItemId || tradeMode !== 'catalog')
                return 'Comprar';
            const listing = findNpcVendorListing(vendor.vendorId, selectedItemId);
            if (!listing)
                return 'Comprar';
            const buyQuote = resolveNpcPurchaseQuote(listing, clampedQuantity);
            const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
            const buyTotal = buyQuote?.totalVolts ?? buyUnit * clampedQuantity;
            return `Comprar por <strong data-vendor-buy-total>${formatVoltsShort(buyTotal)}</strong>`;
        },
        relatedElements: () => {
            const qty = bodyRef.current?.querySelector('[data-vendor-qty]');
            return qty ? [qty] : [];
        },
        onClick: () => {
            if (!selectedItemId || tradeMode !== 'catalog')
                return;
            const result = getActionDispatcher().dispatch({
                type: 'PURCHASE_NPC_ITEM',
                payload: {
                    vendorId: vendor.vendorId,
                    itemId: selectedItemId,
                    quantity: clampedQuantity,
                },
            });
            if (!result.ok) {
                alertSystem(result.reason);
                return;
            }
            if (result.status === 'applied') {
                setTradeQuantity(1);
                bumpGateway();
            }
            return result;
        },
        onResolved: () => {
            setTradeQuantity(1);
            bumpGateway();
        },
    });
    buildSellOptionsRef.current = () => ({
        getLabelHtml: () => {
            if (!selectedItemId)
                return 'Vender';
            if (tradeMode === 'catalog') {
                const listing = findNpcVendorListing(vendor.vendorId, selectedItemId);
                if (!listing)
                    return 'Vender';
                const sellQuote = resolveNpcSellQuote(listing, clampedQuantity);
                const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;
                const sellTotal = sellQuote?.totalVolts ?? sellUnit * clampedQuantity;
                return `Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>`;
            }
            const sellQuote = resolveInventoryItemSellQuote(selectedItemId, clampedQuantity);
            const row = listInventorySellRows(inventory).find((entry) => entry.itemId === selectedItemId);
            const sellTotal = sellQuote?.totalVolts ?? (row?.sellUnitPrice ?? 0) * clampedQuantity;
            return `Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>`;
        },
        relatedElements: () => {
            const qty = bodyRef.current?.querySelector('[data-vendor-qty]');
            return qty ? [qty] : [];
        },
        onClick: () => {
            if (!selectedItemId)
                return;
            const result = getActionDispatcher().dispatch({
                type: 'SELL_NPC_ITEM',
                payload: {
                    vendorId: vendor.vendorId,
                    itemId: selectedItemId,
                    quantity: clampedQuantity,
                },
            });
            if (!result.ok) {
                alertSystem(result.reason);
                return;
            }
            if (result.status === 'applied') {
                setTradeQuantity(1);
                setSelectedItemId(null);
                setTradeMode('catalog');
                bumpGateway();
            }
            return result;
        },
        onResolved: () => {
            setTradeQuantity(1);
            setSelectedItemId(null);
            setTradeMode('catalog');
            bumpGateway();
        },
    });
    useActionGatewayAttach(bodyRef, enabled, [
        { selector: '[data-action="confirm-purchase"]', buildOptions: () => buildPurchaseOptionsRef.current() },
        { selector: '[data-action="confirm-sell"]', buildOptions: () => buildSellOptionsRef.current() },
    ], `${bodyHtml}|${gatewayTick}`);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.dataset.action === 'cancel-trade') {
            setSelectedItemId(null);
            setTradeMode('catalog');
            setTradeQuantity(1);
            return;
        }
        const catalogRow = target.closest('[data-select-vendor-item]');
        if (catalogRow) {
            setSelectedItemId(catalogRow.dataset.selectVendorItem ?? null);
            setTradeMode('catalog');
            setTradeQuantity(1);
            return;
        }
        const inventoryRow = target.closest('[data-select-inventory-item]');
        if (inventoryRow) {
            setSelectedItemId(inventoryRow.dataset.selectInventoryItem ?? null);
            setTradeMode('inventory');
            setTradeQuantity(1);
        }
    }, []);
    const handleInput = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.matches('[data-vendor-qty]'))
            return;
        if (!selectedItemId)
            return;
        const next = clampVendorTradeQuantity(inventory, tradeMode, selectedItemId, Math.max(1, Math.floor(Number(target.value) || 1)));
        setTradeQuantity(next);
    }, [inventory, selectedItemId, tradeMode]);
    useEffect(() => () => {
        purchaseGatewayRef.current.destroy();
        sellGatewayRef.current.destroy();
    }, []);
    return {
        vendor,
        bodyHtml,
        bodyRef,
        handleClick,
        handleInput,
    };
}
