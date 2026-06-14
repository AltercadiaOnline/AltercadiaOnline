/** Raridade exibida na janela de saque — derivada do ItemCatalog no servidor. */
export const LootRarity = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
} as const;

export type LootRarityId = (typeof LootRarity)[keyof typeof LootRarity];

export type LootItemRoll = {
  readonly itemId: string;
  readonly quantity: number;
  readonly rarity: LootRarityId;
};

/** Resultado autoritativo do LootManager — ainda não aplicado ao inventário. */
export type BattleLootBundle = {
  readonly lootId: string;
  readonly sourceId: string;
  readonly winnerId: string;
  readonly voltReward: number;
  readonly items: readonly LootItemRoll[];
};

/** Espelho enviado ao cliente no fim da batalha (sem mutação local). */
export type BattleLootPreview = {
  readonly lootId: string;
  readonly sourceId: string;
  readonly voltReward: number;
  readonly items: readonly LootItemRoll[];
};

export function battleLootPreviewFromBundle(bundle: BattleLootBundle): BattleLootPreview {
  return {
    lootId: bundle.lootId,
    sourceId: bundle.sourceId,
    voltReward: bundle.voltReward,
    items: bundle.items.map((item) => ({ ...item })),
  };
}

export function hasLootContent(preview: BattleLootPreview): boolean {
  return preview.voltReward > 0 || preview.items.length > 0;
}
