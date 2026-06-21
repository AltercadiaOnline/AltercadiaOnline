import { useEffect, useState } from 'react';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerSkinStore } from '../../ui/character/playerSkinStore.js';
import { SKIN_SHOP_CATALOG } from '../../../shared/character/skinShopCatalog.js';
import type { SkinShopItem } from '../../../shared/character/skinShopCatalog.js';

export type ShopPanelItemView = SkinShopItem & {
  readonly owned: boolean;
};

export function useShopPanelState() {
  const [walletFormatted, setWalletFormatted] = useState(
    () => getDataStore().getWallet().voltsFormatted,
  );
  const [items, setItems] = useState<readonly ShopPanelItemView[]>(() => buildShopItems());

  useEffect(() => {
    const refresh = (): void => {
      setWalletFormatted(getDataStore().getWallet().voltsFormatted);
      setItems(buildShopItems());
    };
    const unsubWallet = getDataStore().subscribe('wallet', refresh);
    const unsubSkin = getPlayerSkinStore().subscribe(refresh);
    return () => {
      unsubWallet();
      unsubSkin();
    };
  }, []);

  return { walletFormatted, items };
}

function buildShopItems(): readonly ShopPanelItemView[] {
  const skinStore = getPlayerSkinStore();
  return SKIN_SHOP_CATALOG.map((item) => ({
    ...item,
    owned: skinStore.isOwned(item.slot, item.optionId),
  }));
}
