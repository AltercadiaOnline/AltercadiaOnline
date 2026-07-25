// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { revokeMarketTerminalAccess } from '../../../shared/economy/marketAccessGate.js';
import { ITEM_CATALOG } from '../../../shared/items/itemCatalog.js';
import { ItemRegistry } from '../../../shared/items/ItemRegistry.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { bindDelegatedItemIconFallback } from '../../ui/items/itemIconDisplay.js';
import { buildDefaultMarketOfferFormState, clampMarketOfferQuantity, } from '../../ui/market/marketOfferFormHelpers.js';
import { buildMarketPanelBodyHtml, ensureMarketSelectedBrowseItem, } from '../../ui/market/renderMarketPanelView.js';
import { resolveOwnMarketOfferRef, subscribeMarketplaceOrderBook, } from '../../ui/market/marketplaceOrderBookClient.js';
import { closeHudWindow } from './panelWindowActions.js';
export function useMarketPanel(enabled) {
    const [inventory, setInventory] = useState(() => getDataStore().getInventory());
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [browseCategory, setBrowseCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [offerForm, setOfferForm] = useState(() => buildDefaultMarketOfferFormState(getDataStore().getInventory()));
    const [orderBookTick, setOrderBookTick] = useState(0);
    const bodyRef = useRef(null);
    const sidebarScrollRef = useRef(0);
    const viewModel = useMemo(() => ({
        wallet,
        inventory,
        browseCategory,
        searchQuery,
        offerForm,
    }), [browseCategory, inventory, offerForm, searchQuery, wallet, orderBookTick]);
    const bodyHtml = useMemo(() => buildMarketPanelBodyHtml(viewModel), [viewModel]);
    useEffect(() => {
        const list = bodyRef.current?.querySelector('.market-terminal__item-list');
        if (list)
            list.scrollTop = sidebarScrollRef.current;
    }, [bodyHtml]);
    useEffect(() => {
        if (!enabled)
            return;
        ItemRegistry.syncFromCatalog(ITEM_CATALOG);
        const store = getDataStore();
        const nextInventory = store.getInventory();
        setInventory(nextInventory);
        setWallet(store.getWallet());
        setBrowseCategory('all');
        setSearchQuery('');
        setOfferForm(ensureMarketSelectedBrowseItem('all', '', buildDefaultMarketOfferFormState(nextInventory)));
        const unsubInventory = store.subscribe('inventory', (snapshot) => {
            setInventory(snapshot);
            setOfferForm((current) => ({
                ...current,
                quantity: clampMarketOfferQuantity(current.offerSide, current.selectedItemId, current.quantity, snapshot),
            }));
        });
        const unsubWallet = store.subscribe('wallet', setWallet);
        const unsubOrderBook = subscribeMarketplaceOrderBook(() => {
            setOrderBookTick((tick) => tick + 1);
        });
        return () => {
            unsubInventory();
            unsubWallet();
            unsubOrderBook();
            revokeMarketTerminalAccess();
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled]);
    useEffect(() => {
        if (!enabled || !bodyRef.current)
            return;
        bindDelegatedItemIconFallback(bodyRef.current);
    }, [bodyHtml, enabled]);
    const captureSidebarScroll = useCallback(() => {
        const list = bodyRef.current?.querySelector('.market-terminal__item-list');
        if (list)
            sidebarScrollRef.current = list.scrollTop;
    }, []);
    const publishOffer = useCallback(() => {
        const form = offerForm;
        if (!form.selectedItemId)
            return;
        const qty = clampMarketOfferQuantity(form.offerSide, form.selectedItemId, form.quantity, inventory);
        const unit = Math.max(1, form.unitPriceVolts);
        if (form.offerSide === 'sell') {
            const result = getActionDispatcher().dispatch({
                type: 'CREATE_MARKET_LISTING',
                payload: {
                    itemId: form.selectedItemId,
                    quantity: qty,
                    unitPriceVolts: unit,
                    anonymous: form.anonymous,
                },
            });
            if (!result.ok) {
                alertSystem(result.reason);
                return;
            }
            if (result.status === 'applied') {
                setOfferForm({ ...form, quantity: 1 });
            }
            return;
        }
        const result = getActionDispatcher().dispatch({
            type: 'CREATE_MARKET_BUY_ORDER',
            payload: {
                itemId: form.selectedItemId,
                quantity: qty,
                unitPriceVolts: unit,
                anonymous: form.anonymous,
            },
        });
        if (!result.ok) {
            alertSystem(result.reason);
            return;
        }
    }, [inventory, offerForm]);
    const cancelOffer = useCallback((offerId, side) => {
        const ref = resolveOwnMarketOfferRef(offerId);
        if (!ref || ref.side !== side) {
            alertSystem('Somente suas ofertas podem ser canceladas.');
            return;
        }
        const result = ref.side === 'sell'
            ? getActionDispatcher().dispatch({
                type: 'CANCEL_MARKET_LISTING',
                payload: { listingId: ref.listingId },
            })
            : getActionDispatcher().dispatch({
                type: 'CANCEL_MARKET_BUY_ORDER',
                payload: { orderId: ref.orderId },
            });
        if (!result.ok) {
            alertSystem(result.reason);
        }
    }, []);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.dataset.action === 'close') {
            closeHudWindow('market');
            return;
        }
        if (target.dataset.action === 'publish-offer') {
            publishOffer();
            return;
        }
        const cancelBtn = target.closest('[data-action="cancel-offer"]');
        if (cancelBtn) {
            const offerId = cancelBtn.dataset.offerId;
            const offerSide = cancelBtn.dataset.offerSide;
            if (offerId && (offerSide === 'sell' || offerSide === 'buy')) {
                cancelOffer(offerId, offerSide);
            }
            return;
        }
        const category = target.closest('[data-market-category]')?.dataset.marketCategory;
        if (category) {
            captureSidebarScroll();
            setBrowseCategory(category);
            setOfferForm((current) => ensureMarketSelectedBrowseItem(category, searchQuery, current));
            return;
        }
        const itemId = target.closest('[data-market-item]')?.dataset.marketItem;
        if (itemId) {
            event.preventDefault();
            setOfferForm((current) => (current.selectedItemId === itemId
                ? current
                : { ...current, selectedItemId: itemId }));
            return;
        }
        const side = target.closest('[data-market-side]')?.dataset.marketSide;
        if (side === 'sell' || side === 'buy') {
            setOfferForm((current) => ({ ...current, offerSide: side }));
        }
    }, [browseCategory, cancelOffer, captureSidebarScroll, publishOffer, searchQuery]);
    const handleInput = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        if (target.matches('[data-market-search]')) {
            captureSidebarScroll();
            const nextSearch = target.value;
            setSearchQuery(nextSearch);
            setOfferForm((current) => ensureMarketSelectedBrowseItem(browseCategory, nextSearch, current));
            return;
        }
        if (target.matches('[data-market-offer-qty]')) {
            setOfferForm((current) => ({
                ...current,
                quantity: clampMarketOfferQuantity(current.offerSide, current.selectedItemId, Number(target.value) || 1, inventory),
            }));
            return;
        }
        if (target.matches('[data-market-offer-price]')) {
            setOfferForm((current) => ({
                ...current,
                unitPriceVolts: Math.max(1, Math.floor(Number(target.value) || 1)),
            }));
            return;
        }
        if (target.matches('[data-market-offer-anon]')) {
            setOfferForm((current) => ({ ...current, anonymous: target.checked }));
        }
    }, [browseCategory, captureSidebarScroll, inventory]);
    return {
        bodyHtml,
        bodyRef,
        handleClick,
        handleInput,
    };
}
