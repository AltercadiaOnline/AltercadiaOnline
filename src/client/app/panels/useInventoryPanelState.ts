import { useEffect, useState } from 'react';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../../ui/vendor/npcVendorSession.js';
import { usePlayerInventoryAndGold } from '../store/gameStore.js';

/**
 * Estado reativo do inventário — só espelha inventário/ouro + sessão de vendedor.
 * Sem spinner global: loot/economia não devem “carregar” a grade.
 */
export function useInventoryPanelState() {
  const { inventory, gold } = usePlayerInventoryAndGold();
  const [vendorOpen, setVendorOpen] = useState(() => isNpcVendorShopOpen());

  useEffect(() => subscribeNpcVendorShopOpen(() => {
    setVendorOpen(isNpcVendorShopOpen());
  }), []);

  return {
    inventory,
    gold,
    vendorOpen,
  };
}
