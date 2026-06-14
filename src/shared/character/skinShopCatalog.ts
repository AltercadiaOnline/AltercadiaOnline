import {
  SKIN_SLOT_CATALOG,
  SKIN_SLOT_ORDER,
  type SkinOption,
  type SkinSlotId,
} from './playerSkin.js';

/** Item vendável na Loja de Skins — cosmético only, sem stats. */
export type SkinShopItem = {
  readonly slot: SkinSlotId;
  readonly optionId: string;
  readonly name: string;
  readonly accent: string;
  readonly price: number;
};

const DEFAULT_SHOP_PRICES: Record<SkinSlotId, readonly number[]> = {
  hair: [0, 280, 320, 250],
  shirt: [0, 450, 380, 420],
  pants: [0, 350, 300, 340],
  shoes: [0, 220, 260, 240],
};

function buildShopCatalog(): readonly SkinShopItem[] {
  const items: SkinShopItem[] = [];

  for (const slot of SKIN_SLOT_ORDER) {
    const options = SKIN_SLOT_CATALOG[slot];
    const prices = DEFAULT_SHOP_PRICES[slot];

    options.forEach((option: SkinOption, index: number) => {
      const price = prices[index] ?? 300;
      if (price <= 0) return;
      items.push({
        slot,
        optionId: option.id,
        name: option.label,
        accent: option.accent,
        price,
      });
    });
  }

  return items;
}

export const SKIN_SHOP_CATALOG: readonly SkinShopItem[] = buildShopCatalog();

export function getSkinShopItem(slot: SkinSlotId, optionId: string): SkinShopItem | undefined {
  return SKIN_SHOP_CATALOG.find((item) => item.slot === slot && item.optionId === optionId);
}

export function getDefaultOwnedSkinIds(): Record<SkinSlotId, readonly string[]> {
  return {
    hair: [SKIN_SLOT_CATALOG.hair[0]!.id],
    shirt: [SKIN_SLOT_CATALOG.shirt[0]!.id],
    pants: [SKIN_SLOT_CATALOG.pants[0]!.id],
    shoes: [SKIN_SLOT_CATALOG.shoes[0]!.id],
  };
}
