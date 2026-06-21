import { useEffect, useMemo, useState } from 'react';
import {
  findNpcVendorListing,
  getNpcVendorListings,
} from '../../../shared/economy/npcVendorCatalog.js';
import {
  listInventoryNpcBlockedRows,
  listInventorySellRows,
} from '../../ui/vendor/inventorySellRows.js';
import { setNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerData } from '../store/gameStore.js';

export type VendorShopView = {
  readonly vendorId: string;
  readonly vendorName: string;
};

export type VendorTradeMode = 'catalog' | 'inventory';

export function resolveVendorFromContext(
  context: WorldPanelContext,
): VendorShopView {
  if (context.kind === 'vendorShop') {
    return {
      vendorId: context.vendorId,
      vendorName: context.vendorName,
    };
  }
  return { vendorId: 'vendedor', vendorName: 'Vendedor' };
}

export function useVendorShopPanelState(vendor: VendorShopView) {
  const { inventory, gold } = usePlayerData();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tradeMode, setTradeMode] = useState<VendorTradeMode>('catalog');
  const [tradeQuantity, setTradeQuantity] = useState(1);

  useEffect(() => {
    setNpcVendorShopOpen(true);
    return () => setNpcVendorShopOpen(false);
  }, []);

  const listings = useMemo(
    () => getNpcVendorListings(vendor.vendorId),
    [vendor.vendorId],
  );

  const inventoryRows = useMemo(
    () => listInventorySellRows(inventory),
    [inventory],
  );

  const blockedRows = useMemo(
    () => listInventoryNpcBlockedRows(inventory),
    [inventory],
  );

  const selectedListing = useMemo(() => {
    if (tradeMode !== 'catalog' || !selectedItemId) return null;
    return findNpcVendorListing(vendor.vendorId, selectedItemId);
  }, [selectedItemId, tradeMode, vendor.vendorId]);

  const selectedInventoryRow = useMemo(() => {
    if (tradeMode !== 'inventory' || !selectedItemId) return null;
    return inventoryRows.find((row) => row.itemId === selectedItemId) ?? null;
  }, [inventoryRows, selectedItemId, tradeMode]);

  const countInventoryItem = (itemId: string): number => {
    let total = 0;
    for (const slot of inventory.slots) {
      if (slot.itemId === itemId && slot.quantity > 0) {
        total += slot.quantity;
      }
    }
    return total;
  };

  const selectCatalogItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setTradeMode('catalog');
    setTradeQuantity(1);
  };

  const selectInventoryItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setTradeMode('inventory');
    setTradeQuantity(1);
  };

  const cancelSelection = () => {
    setSelectedItemId(null);
    setTradeMode('catalog');
    setTradeQuantity(1);
  };

  const clampTradeQuantity = (qty: number): number => {
    const floored = Math.max(1, Math.floor(qty));
    if (tradeMode === 'inventory' && selectedItemId) {
      const owned = countInventoryItem(selectedItemId);
      if (owned > 0) return Math.min(floored, owned);
    }
    return floored;
  };

  const setClampedTradeQuantity = (qty: number) => {
    setTradeQuantity(clampTradeQuantity(qty));
  };

  const resetAfterPurchase = () => {
    setTradeQuantity(1);
  };

  const resetAfterSell = () => {
    setTradeQuantity(1);
    setSelectedItemId(null);
    setTradeMode('catalog');
  };

  return {
    vendor,
    gold,
    inventory,
    listings,
    inventoryRows,
    blockedRows,
    selectedItemId,
    tradeMode,
    tradeQuantity,
    selectedListing,
    selectedInventoryRow,
    selectCatalogItem,
    selectInventoryItem,
    cancelSelection,
    setClampedTradeQuantity,
    resetAfterPurchase,
    resetAfterSell,
    countInventoryItem,
  };
}
