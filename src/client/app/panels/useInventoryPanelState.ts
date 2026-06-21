import { useEffect, useState } from 'react';
import { isSyncPending } from '../../core/gameStoreSelectors.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
import { usePlayerData } from '../store/gameStore.js';

/** Estado reativo do inventário — espelha GameStore + sessão de vendedor NPC. */
export function useInventoryPanelState() {
  const { inventory, gold } = usePlayerData();
  const [syncPending, setSyncPending] = useState(() => isSyncPending());
  const [vendorOpen, setVendorOpen] = useState(() => isNpcVendorShopOpen());

  useEffect(() => {
    return subscribeGameStore((state, slice) => {
      if (slice !== 'player' && slice !== 'pendingActions' && slice !== '*') return;
      setSyncPending(isSyncPending(state));
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
