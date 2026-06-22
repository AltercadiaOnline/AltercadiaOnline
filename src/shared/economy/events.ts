import type { EquippedSlots } from '../character/equipmentState.js';
import type { EquipmentUiGridState } from '../character/equipmentUiSlots.js';

export const EconomyEventType = {
  LootGranted: 'LOOT_GRANTED',
  WalletUpdated: 'WALLET_UPDATE',
  AlterExchangeCompleted: 'ALTER_EXCHANGE_COMPLETED',
  InventoryUpdated: 'INVENTORY_UPDATE',
  ItemEquipped: 'ITEM_EQUIPPED',
  TransactionFailed: 'ECONOMY_TRANSACTION_FAILED',
  TransactionSuccess: 'TRANSACTION_SUCCESS',
  UpdateBankSuccess: 'UPDATE_BANK_SUCCESS',
  WorldVitalsUpdated: 'WORLD_VITALS_UPDATED',
  PetAffinityUpdated: 'PET_AFFINITY_UPDATED',
  PetRosterUpdated: 'PET_ROSTER_UPDATED',
  MarcosStateUpdated: 'MARCOS_STATE_UPDATED',
  SkinOwnershipUpdated: 'SKIN_OWNERSHIP_UPDATED',
  MarketplaceUpdated: 'MARKETPLACE_UPDATED',
} as const;

export type EconomyEventTypeId = (typeof EconomyEventType)[keyof typeof EconomyEventType];

export type LootGrantedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly creatureId: string;
  readonly dollarVolt: number;
  readonly itemIds: readonly string[];
  readonly lootId?: string;
  readonly items?: readonly {
    readonly itemId: string;
    readonly quantity: number;
    readonly rarity: string;
  }[];
};

export type WalletUpdatedPayload = {
  readonly playerId: string;
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly revision?: number;
  readonly intentId?: string;
};

/** Payload reativo de carteira — inclui delta para tween/feedback na HUD. */
export type BalanceChangedPayload = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly voltsFormatted: string;
  readonly alterFormatted: string;
  readonly previousDollarVolt: number;
  readonly previousAlterCoins: number;
  readonly deltaVolts: number;
  readonly deltaAlter: number;
};

export type AlterExchangeCompletedPayload = {
  readonly playerId: string;
  readonly alterSpent: number;
  readonly voltsReceived: number;
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly revision?: number;
  readonly intentId?: string;
};

export type InventoryUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly items: readonly {
    readonly itemId: string;
    readonly quantity: number;
    readonly charges?: number;
    readonly lockedQuantity?: number;
  }[];
  /** SET autoritativo — ex.: runa/livro removidos ao esgotar cargas. */
  readonly equipped?: EquippedSlots;
  /** Grade visual 10 slots — preserva anel E/D e pernas/botas. */
  readonly equipmentUiGrid?: EquipmentUiGridState;
  readonly revision?: number;
  readonly intentId?: string;
  /** Hash determinístico do inventário (itemId, qty, charges, lockedQuantity). */
  readonly inventoryChecksum?: string;
};

export type UpdateBankSuccessPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly message: string;
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly inventory: readonly { readonly itemId: string; readonly quantity: number; readonly lockedQuantity?: number }[];
  readonly bankItemStacks: readonly { readonly itemId: string; readonly quantity: number }[];
  readonly bankCurrencies: { readonly dollarVolt: number; readonly alterCoins: number };
  readonly revision?: number;
  readonly intentId?: string;
};

export type WorldVitalsUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly vitals: import('../character/equipmentState.js').PlayerWorldVitals;
  readonly message: string;
  readonly revision?: number;
  readonly intentId?: string;
};

export type PetAffinityUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly rationCharges: number;
  readonly lastPetRationFeedAtMs: number | null;
  readonly lastPetAffectionAtMs: number | null;
  readonly message?: string;
  readonly revision?: number;
  readonly intentId?: string;
};

export type PetRosterUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly pets: readonly import('../pet/petModel.js').PetSnapshot[];
  readonly activeSlotIndex: number | null;
  readonly selectedSlotIndex: number;
  readonly message?: string;
  readonly revision?: number;
  readonly intentId?: string;
};

export type MarcosStateUpdatedPayload = Omit<
  import('../playerDataSnapshots.js').MarcosStateSnapshot,
  'revision'
> & {
  readonly playerId: string;
  readonly characterId: number;
  readonly revision?: number;
  readonly intentId?: string;
};

export type MarketplaceUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly offers: readonly import('./marketplaceOrderBook.js').MarketOfferRow[];
  readonly ownListings: readonly {
    readonly id: string;
    readonly itemId: string;
    readonly itemName: string;
    readonly quantity: number;
    readonly unitPriceVolts: number;
    readonly totalPriceVolts: number;
    readonly status: 'LISTED' | 'SOLD';
    readonly anonymous?: boolean;
    readonly createdAt: number;
    readonly soldAt?: number;
  }[];
  readonly ownBuyOrders: readonly {
    readonly id: string;
    readonly itemId: string;
    readonly itemName: string;
    readonly quantity: number;
    readonly unitPriceVolts: number;
    readonly totalPriceVolts: number;
    readonly anonymous: boolean;
    readonly createdAt: number;
  }[];
  readonly message?: string;
  readonly revision?: number;
  readonly intentId?: string;
};

export type SkinOwnershipUpdatedPayload = {
  readonly playerId: string;
  readonly characterId: number;
  readonly ownedSkins: Record<
    import('../character/playerSkin.js').SkinSlotId,
    readonly string[]
  >;
  readonly message?: string;
  readonly revision?: number;
  readonly intentId?: string;
};

export type EconomyEvent =
  | { readonly type: typeof EconomyEventType.LootGranted; readonly payload: LootGrantedPayload }
  | { readonly type: typeof EconomyEventType.WalletUpdated; readonly payload: WalletUpdatedPayload }
  | {
      readonly type: typeof EconomyEventType.AlterExchangeCompleted;
      readonly payload: AlterExchangeCompletedPayload;
    }
  | { readonly type: typeof EconomyEventType.InventoryUpdated; readonly payload: InventoryUpdatedPayload }
  | { readonly type: typeof EconomyEventType.UpdateBankSuccess; readonly payload: UpdateBankSuccessPayload }
  | { readonly type: typeof EconomyEventType.WorldVitalsUpdated; readonly payload: WorldVitalsUpdatedPayload }
  | { readonly type: typeof EconomyEventType.PetAffinityUpdated; readonly payload: PetAffinityUpdatedPayload }
  | { readonly type: typeof EconomyEventType.PetRosterUpdated; readonly payload: PetRosterUpdatedPayload }
  | { readonly type: typeof EconomyEventType.MarcosStateUpdated; readonly payload: MarcosStateUpdatedPayload }
  | { readonly type: typeof EconomyEventType.SkinOwnershipUpdated; readonly payload: SkinOwnershipUpdatedPayload }
  | { readonly type: typeof EconomyEventType.MarketplaceUpdated; readonly payload: MarketplaceUpdatedPayload }
  | { readonly type: typeof EconomyEventType.TransactionFailed; readonly payload: { readonly message: string; readonly intentId?: string; readonly playerId?: string } }
  | {
      readonly type: typeof EconomyEventType.TransactionSuccess;
      readonly payload: { readonly intentId?: string; readonly revision?: number };
    };

export type EconomyEventHandler = (event: EconomyEvent) => void;
