import { useCallback, useEffect, useMemo, useState } from 'react';
import { getItemById, ITEM_CATALOG } from '../../../shared/items/itemCatalog.js';
import { ItemRegistry } from '../../../shared/items/ItemRegistry.js';
import {
  buildMarketOfferTableView,
  listMarketBrowseItems,
  type MarketBrowseCategoryId,
  type MarketOfferRow,
  type MarketOfferSide,
} from '../../../shared/economy/marketplaceOrderBook.js';
import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { alertSystem } from '../../ui/alertSystem.js';
import {
  buildDefaultMarketOfferFormState,
  clampMarketOfferQuantity,
  type MarketOfferFormState,
} from '../../ui/market/marketOfferFormHelpers.js';
import {
  getMarketplaceOrderBookSnapshot,
  resolveOwnMarketOfferRef,
  resolveP2pMarketOfferRef,
  subscribeMarketplaceOrderBook,
} from '../../ui/market/marketplaceOrderBookClient.js';
import { listMarketSellInventoryRows } from '../../ui/market/marketSellForm.js';

export type MarketSidebarSource = 'catalog' | 'inventory';

export function useMarketPanelState() {
  const dataStore = getDataStore();
  const dispatcher = getActionDispatcher();

  const [inventory, setInventory] = useState<InventorySnapshot>(() => dataStore.getInventory());
  const [wallet, setWallet] = useState<WalletSnapshot>(() => dataStore.getWallet());
  const [orderBookTick, setOrderBookTick] = useState(0);
  const [browseCategory, setBrowseCategory] = useState<MarketBrowseCategoryId>('all');
  const [browseSource, setBrowseSource] = useState<MarketSidebarSource>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [offerForm, setOfferForm] = useState<MarketOfferFormState>(() => ({
    ...buildDefaultMarketOfferFormState(dataStore.getInventory()),
    selectedItemId: null,
  }));

  useEffect(() => {
    ItemRegistry.syncFromCatalog(ITEM_CATALOG);

    const unsubInventory = dataStore.subscribe('inventory', (snapshot) => {
      setInventory(snapshot);
      setOfferForm((prev) => ({
        ...prev,
        quantity: clampMarketOfferQuantity(
          prev.offerSide,
          prev.selectedItemId,
          prev.quantity,
          snapshot,
        ),
      }));
    });

    const unsubWallet = dataStore.subscribe('wallet', setWallet);
    const unsubOrderBook = subscribeMarketplaceOrderBook(() => {
      setOrderBookTick((tick) => tick + 1);
    });

    return () => {
      unsubInventory();
      unsubWallet();
      unsubOrderBook();
    };
  }, [dataStore]);

  const browseItems = useMemo(
    () => listMarketBrowseItems(browseCategory, searchQuery),
    [browseCategory, searchQuery],
  );

  const sellRows = useMemo(() => listMarketSellInventoryRows(inventory), [inventory]);

  const sidebarItems = useMemo(() => {
    if (browseSource !== 'inventory') {
      return browseItems;
    }

    const query = searchQuery.trim().toLocaleLowerCase('pt-BR');
    return sellRows
      .filter((row) => !query || row.label.toLocaleLowerCase('pt-BR').includes(query))
      .map((row) => ({
        itemId: row.itemId,
        label: `${row.label} ×${row.quantity}`,
        categoryId: browseCategory,
      }));
  }, [browseCategory, browseItems, browseSource, searchQuery, sellRows]);

  useEffect(() => {
    setOfferForm((prev) => {
      if (!prev.selectedItemId) return prev;
      const stillVisible = sidebarItems.some((item) => item.itemId === prev.selectedItemId);
      if (stillVisible) return prev;
      if (getItemById(prev.selectedItemId)) return prev;
      return { ...prev, selectedItemId: null };
    });
  }, [sidebarItems]);

  const orderBook = useMemo(
    () => getMarketplaceOrderBookSnapshot(),
    [orderBookTick],
  );

  const selectedItemId = offerForm.selectedItemId;

  useEffect(() => {
    dispatcher.dispatch({
      type: 'QUERY_MARKET_ORDER_BOOK',
      payload: { itemId: selectedItemId },
    });
  }, [dispatcher, selectedItemId]);

  const sellView = useMemo(
    () => buildMarketOfferTableView(orderBook, 'sell', selectedItemId),
    [orderBook, selectedItemId],
  );

  const buyView = useMemo(
    () => buildMarketOfferTableView(orderBook, 'buy', selectedItemId),
    [orderBook, selectedItemId],
  );

  const quantity = selectedItemId
    ? clampMarketOfferQuantity(
      offerForm.offerSide,
      selectedItemId,
      offerForm.quantity,
      inventory,
    )
    : 1;

  const unitPriceVolts = Math.max(1, offerForm.unitPriceVolts);
  const offerTotal = quantity * unitPriceVolts;

  const canSellItem = selectedItemId
    ? sellRows.some((row) => row.itemId === selectedItemId)
    : false;

  const maxSellQty = selectedItemId
    ? sellRows.find((row) => row.itemId === selectedItemId)?.quantity ?? 0
    : 0;

  const submitDisabled = !selectedItemId
    || (offerForm.offerSide === 'sell' && !canSellItem)
    || (offerForm.offerSide === 'buy' && wallet.dollarVolt < offerTotal);

  const selectCategory = useCallback((category: MarketBrowseCategoryId) => {
    setBrowseCategory(category);
  }, []);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const selectBrowseItem = useCallback((itemId: string) => {
    setOfferForm((prev) => (
      prev.selectedItemId === itemId
        ? { ...prev, selectedItemId: null }
        : { ...prev, selectedItemId: itemId }
    ));
  }, []);

  const setOfferSide = useCallback((side: MarketOfferSide) => {
    if (side === 'sell') {
      setBrowseSource('inventory');
    }
    setOfferForm((prev) => ({ ...prev, offerSide: side }));
  }, []);

  const setBrowseSourceMode = useCallback((source: MarketSidebarSource) => {
    setBrowseSource(source);
  }, []);

  const updateQuantity = useCallback((nextQuantity: number) => {
    setOfferForm((prev) => ({
      ...prev,
      quantity: clampMarketOfferQuantity(
        prev.offerSide,
        prev.selectedItemId,
        nextQuantity,
        inventory,
      ),
    }));
  }, [inventory]);

  const updateUnitPrice = useCallback((nextPrice: number) => {
    setOfferForm((prev) => ({
      ...prev,
      unitPriceVolts: Math.max(1, Math.floor(nextPrice) || 1),
    }));
  }, []);

  const setAnonymous = useCallback((anonymous: boolean) => {
    setOfferForm((prev) => ({ ...prev, anonymous }));
  }, []);

  const cancelOffer = useCallback((offerId: string, side: MarketOfferSide) => {
    const ref = resolveOwnMarketOfferRef(offerId);
    if (!ref || ref.side !== side) {
      alertSystem('Somente suas ofertas podem ser canceladas.');
      return;
    }

    const result = ref.side === 'sell'
      ? dispatcher.dispatch({
        type: 'CANCEL_MARKET_LISTING',
        payload: { listingId: ref.listingId },
      })
      : dispatcher.dispatch({
        type: 'CANCEL_MARKET_BUY_ORDER',
        payload: { orderId: ref.orderId },
      });

    if (!result.ok) {
      alertSystem(result.reason);
    }
  }, [dispatcher]);

  const purchaseOffer = useCallback((offerId: string) => {
    const ref = resolveP2pMarketOfferRef(offerId);
    if (!ref) {
      alertSystem('Somente ofertas P2P de outros jogadores podem ser compradas aqui.');
      return;
    }

    const result = dispatcher.dispatch({
      type: 'EXECUTE_MARKET_PURCHASE',
      payload: { listingId: ref.listingId },
    });
    if (!result.ok) {
      alertSystem(result.reason);
    }
  }, [dispatcher]);

  const publishOffer = useCallback(() => {
    if (!offerForm.selectedItemId) return;

    const qty = clampMarketOfferQuantity(
      offerForm.offerSide,
      offerForm.selectedItemId,
      offerForm.quantity,
      inventory,
    );
    const unit = Math.max(1, offerForm.unitPriceVolts);

    if (offerForm.offerSide === 'sell') {
      const result = dispatcher.dispatch({
        type: 'CREATE_MARKET_LISTING',
        payload: {
          itemId: offerForm.selectedItemId,
          quantity: qty,
          unitPriceVolts: unit,
          anonymous: offerForm.anonymous,
        },
      });
      if (!result.ok) {
        alertSystem(result.reason);
        return;
      }
      setBrowseSource('catalog');
      setBrowseCategory('all');
      setSearchQuery('');
      setOfferForm((prev) => ({ ...prev, quantity: 1 }));
      return;
    }

    const result = dispatcher.dispatch({
      type: 'CREATE_MARKET_BUY_ORDER',
      payload: {
        itemId: offerForm.selectedItemId,
        quantity: qty,
        unitPriceVolts: unit,
        anonymous: offerForm.anonymous,
      },
    });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    setBrowseSource('catalog');
    setBrowseCategory('all');
    setSearchQuery('');
  }, [dispatcher, inventory, offerForm]);

  return {
    wallet,
    browseCategory,
    browseSource,
    searchQuery,
    browseItems,
    sidebarItems,
    sellRowCount: sellRows.length,
    offerForm,
    selectedItemId,
    sellView,
    buyView,
    quantity,
    unitPriceVolts,
    offerTotal,
    canSellItem,
    maxSellQty,
    submitDisabled,
    selectCategory,
    setBrowseSourceMode,
    updateSearchQuery,
    selectBrowseItem,
    setOfferSide,
    updateQuantity,
    updateUnitPrice,
    setAnonymous,
    cancelOffer,
    purchaseOffer,
    publishOffer,
  };
}

export type { MarketOfferRow };
