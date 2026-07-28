import { useEffect, useState } from 'react';
import {
  getPendingIntentRegistry,
  isInventoryUiSyncPending,
} from '../../sync/pendingIntentRegistry.js';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
import { usePlayerInventoryAndGold } from '../store/gameStore.js';

/** Estado reativo do inventário — espelha GameStore + sessão de vendedor NPC. */
export function useInventoryPanelState() {
  const { inventory, gold } = usePlayerInventoryAndGold();
  const [syncPending, setSyncPending] = useState(() => isInventoryUiSyncPending());
  const [vendorOpen, setVendorOpen] = useState(() => isNpcVendorShopOpen());

  useEffect(() => {
    return getPendingIntentRegistry().subscribeChange(() => {
      setSyncPending(isInventoryUiSyncPending());
    });
  }, []);

  useEffect(() => subscribeNpcVendorShopOpen(() => {
    setVendorOpen(isNpcVendorShopOpen());
  }), []);

  return {
    inventory,
    gold,
    syncPending,
    vendorOpen,
  };
}
