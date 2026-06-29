import type { ActiveBookBuff, EquippedSlots, InventoryStack } from '../character/equipmentState.js';
import type { BankCurrencyBalances } from '../bank/bankTypes.js';
import type { PlayerWorldProfile } from '../world/playerWorldProfile.js';
import type { PlayerProgressionData } from '../progression/playerProgressionData.js';
import type { MarcosNodeProgressionData } from '../progression/marcoProgression.js';
import { createDefaultPlayerProgressionData } from '../progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../progression/marcoProgression.js';
import { createDefaultWorldProfile } from '../world/playerWorldProfile.js';

import type { PlayerPetRosterSnapshot } from '../pet/petRoster.js';
import type { SkinSlotId } from '../character/playerSkin.js';

/** Versão do schema JSON — incrementar ao mudar formato. */
export const CHARACTER_PERSISTENCE_SCHEMA_VERSION = 2;

export type PersistedWalletSlice = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly lockedDollarVolt: number;
  readonly lockedAlterCoins: number;
};

export type PersistedBankSlice = {
  readonly itemStacks: readonly InventoryStack[];
  readonly currencies: BankCurrencyBalances;
};

export type PersistedCharacterProfileSlice = {
  readonly level: number;
  readonly xpCurrent: number;
  readonly displayName?: string;
  readonly skinBundleId?: string;
};

export type PersistedMarcosSlice = {
  readonly activeMarcos: readonly string[];
  readonly flowSpeedBase: number;
  readonly nodeProgression: MarcosNodeProgressionData;
};

export type PersistedPetAffinitySlice = {
  readonly rationCharges: number;
  readonly lastPetRationFeedAtMs: number | null;
  readonly lastPetAffectionAtMs: number | null;
};

export type PersistedOwnedSkinsSlice = Record<SkinSlotId, readonly string[]>;

export type PersistedMarketplaceListingSlice = {
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
};

export type PersistedMarketplaceBuyOrderSlice = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous: boolean;
  readonly createdAt: number;
};

export type PersistedMarketplaceSlice = {
  readonly listings: readonly PersistedMarketplaceListingSlice[];
  readonly buyOrders: readonly PersistedMarketplaceBuyOrderSlice[];
};

/** Snapshot autoritativo persistido por personagem (playerId + characterId). */
export type CharacterPersistenceRecord = {
  readonly schemaVersion: 1 | typeof CHARACTER_PERSISTENCE_SCHEMA_VERSION;
  readonly playerId: string;
  readonly characterId: number;
  readonly updatedAt: number;
  readonly wallet: PersistedWalletSlice;
  readonly economy: {
    readonly inventory: readonly InventoryStack[];
    readonly equipped: EquippedSlots;
    readonly activeBookBuff: ActiveBookBuff;
    readonly bank: PersistedBankSlice;
  };
  readonly world: PlayerWorldProfile;
  readonly progression: PlayerProgressionData;
  readonly marcos: PersistedMarcosSlice;
  readonly characterProfile: PersistedCharacterProfileSlice;
  readonly petRoster?: PlayerPetRosterSnapshot;
  readonly petAffinity?: PersistedPetAffinitySlice;
  readonly ownedSkins?: PersistedOwnedSkinsSlice;
  readonly marketplace?: PersistedMarketplaceSlice;
};

export function characterPersistenceKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function createEmptyCharacterPersistenceRecord(
  playerId: string,
  characterId: number,
): CharacterPersistenceRecord {
  const now = Date.now();
  return {
    schemaVersion: CHARACTER_PERSISTENCE_SCHEMA_VERSION,
    playerId,
    characterId,
    updatedAt: now,
    wallet: {
      dollarVolt: 0,
      alterCoins: 0,
      lockedDollarVolt: 0,
      lockedAlterCoins: 0,
    },
    economy: {
      inventory: [],
      equipped: {},
      activeBookBuff: null,
      bank: {
        itemStacks: [],
        currencies: { dollarVolt: 0, alterCoins: 0 },
      },
    },
    world: createDefaultWorldProfile(),
    progression: createDefaultPlayerProgressionData(),
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      nodeProgression: emptyMarcosNodeProgression(),
    },
    characterProfile: {
      level: 1,
      xpCurrent: 0,
    },
  };
}

export function isCharacterPersistenceRecord(value: unknown): value is CharacterPersistenceRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as CharacterPersistenceRecord;
  return (
    (record.schemaVersion === 1 || record.schemaVersion === CHARACTER_PERSISTENCE_SCHEMA_VERSION)
    && typeof record.playerId === 'string'
    && typeof record.characterId === 'number'
    && typeof record.updatedAt === 'number'
    && record.economy !== null
    && typeof record.economy === 'object'
    && record.world !== null
    && typeof record.world === 'object'
  );
}
