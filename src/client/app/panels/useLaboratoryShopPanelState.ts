import { useMemo, useState } from 'react';
import {
  filterLabListingsByTab,
  findNpcVendorListing,
  getNpcVendorListings,
  LAB_SHOP_TABS,
  type LabShopTabId,
} from '../../../shared/economy/npcVendorCatalog.js';
import { resolveEffectiveNpcBuyUnitPrice } from '../../../shared/economy/npcVendorService.js';
import { resolveMaxLabPurchaseQuantity } from '../../ui/vendor/labPurchaseHelpers.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerData } from '../store/gameStore.js';

export type LaboratoryShopView = {
  readonly vendorId: string;
  readonly vendorName: string;
};

export function resolveLaboratoryFromContext(
  context: WorldPanelContext,
): LaboratoryShopView {
  if (context.kind === 'laboratoryShop') {
    return {
      vendorId: context.vendorId,
      vendorName: context.vendorName,
    };
  }
  return { vendorId: 'alquimista', vendorName: 'Alquimista' };
}

export function useLaboratoryShopPanelState(vendor: LaboratoryShopView) {
  const { inventory, gold } = usePlayerData();
  const [activeTab, setActiveTab] = useState<LabShopTabId>('potions');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const listings = useMemo(
    () => filterLabListingsByTab(getNpcVendorListings(vendor.vendorId), activeTab),
    [activeTab, vendor.vendorId],
  );

  const selectedListing = useMemo(() => {
    if (!selectedItemId) return null;
    return findNpcVendorListing(vendor.vendorId, selectedItemId);
  }, [selectedItemId, vendor.vendorId]);

  const maxPurchaseQuantity = useMemo(() => {
    if (!selectedListing) return 1;
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(selectedListing.itemId, selectedListing) ?? 0;
    return resolveMaxLabPurchaseQuantity(
      selectedListing.itemId,
      inventory,
      gold.dollarVolt,
      buyUnit,
    );
  }, [gold.dollarVolt, inventory, selectedListing]);

  const clampedQuantity = Math.min(
    purchaseQuantity,
    Math.max(1, maxPurchaseQuantity),
  );

  const countInventoryItem = (itemId: string): number => {
    let total = 0;
    for (const slot of inventory.slots) {
      if (slot.itemId === itemId && slot.quantity > 0) {
        total += slot.quantity;
      }
    }
    return total;
  };

  const selectTab = (tabId: LabShopTabId) => {
    setActiveTab(tabId);
    setSelectedItemId(null);
    setPurchaseQuantity(1);
  };

  const selectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setPurchaseQuantity(1);
  };

  const setClampedPurchaseQuantity = (qty: number) => {
    const floored = Math.max(1, Math.floor(qty));
    setPurchaseQuantity(Math.min(floored, Math.max(1, maxPurchaseQuantity)));
  };

  const resetAfterPurchase = () => {
    setPurchaseQuantity(1);
  };

  return {
    vendor,
    gold,
    inventory,
    tabs: LAB_SHOP_TABS,
    activeTab,
    listings,
    selectedListing,
    purchaseQuantity: clampedQuantity,
    maxPurchaseQuantity,
    selectTab,
    selectItem,
    setClampedPurchaseQuantity,
    resetAfterPurchase,
    countInventoryItem,
  };
}
