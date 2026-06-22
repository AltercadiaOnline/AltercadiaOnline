import type { InventorySnapshot } from './character/inventorySlots.js';
import type { EquippedSlots } from './character/equipmentState.js';
import type { EquipmentUiGridState } from './character/equipmentUiSlots.js';
import type { BankStorageSnapshot } from './bank/bankTypes.js';
import type { PlayerPetRosterSnapshot } from './pet/petRoster.js';
import type { MarcoRamificacaoId } from './progression/milestoneTreeCatalog.js';
import type { MarcosNodeProgressionData } from './progression/marcoProgression.js';
import type { MovesProgressionData } from './progression/moveProgression.js';
import type { PlayerFacing } from './world/playerFacing.js';
import type { WithRevision } from './snapshotRevision.js';

/** Snapshot de carteira exposto ao front-end (com revision anti-replay). */
export type WalletSnapshot = WithRevision<{
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly voltsFormatted: string;
  readonly alterFormatted: string;
}>;

/** Snapshot unificado de progressão Marcos (trilha + nós ativos + nível por nó). */
export type MarcosStateSnapshot = WithRevision<{
  readonly activeMarcos: readonly string[];
  readonly flowSpeedBase: number;
  readonly milestoneTotalProgress: number;
  readonly ramificacaoSelecionada: MarcoRamificacaoId | null;
  readonly trilhaTravada: boolean;
  readonly nodeProgression: MarcosNodeProgressionData;
}>;

/** Delta parcial — servidor envia só nós alterados após PROGRESS_MARCO. */
export type MarcoProgressDelta = {
  readonly nodeProgression: MarcosNodeProgressionData;
  readonly levelUps?: readonly string[];
};

export type InventoryDataSnapshot = WithRevision<
  InventorySnapshot & { readonly inventoryChecksum?: string }
>;

export type BankStorageDataSnapshot = BankStorageSnapshot;

export type MovesProgressionSnapshot = WithRevision<MovesProgressionData>;

/** Nível do personagem — SSOT no PlayerDataStore (independente do domínio de moves). */
export type CharacterLevelSnapshot = WithRevision<{
  readonly level: number;
  readonly xpCurrent: number;
  readonly xpToNext: number;
}>;

/** Roster de pets — slots, convocação e afinidade por instância. */
export type PetRosterDataSnapshot = WithRevision<PlayerPetRosterSnapshot>;

/** Cooldowns de carinho/ration e cargas especiais — metadados de Pet Love. */
export type PetAffinityStateSnapshot = WithRevision<{
  readonly lastPetAffectionAtMs: number | null;
  readonly lastPetRationFeedAtMs: number | null;
  readonly rationCharges: number;
}>;

/** Posição autoritativa no mapa de exploração (espelho do servidor). */
export type WorldPositionSnapshot = WithRevision<{
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
  readonly moveSeq: number;
}>;

export type PlayerDataSnapshot = {
  readonly revision: number;
  readonly characterLevel: CharacterLevelSnapshot;
  readonly wallet: WalletSnapshot;
  readonly inventory: InventoryDataSnapshot;
  readonly bankStorage: BankStorageDataSnapshot;
  readonly marcosState: MarcosStateSnapshot;
  readonly movesProgression: MovesProgressionSnapshot;
  readonly worldPosition: WorldPositionSnapshot | null;
};

export type DataStoreSlice =
  | 'characterLevel'
  | 'wallet'
  | 'inventory'
  | 'bankStorage'
  | 'marcosState'
  | 'movesProgression';

export type DataStoreSliceSnapshot = {
  characterLevel: CharacterLevelSnapshot;
  wallet: WalletSnapshot;
  inventory: InventoryDataSnapshot;
  bankStorage: BankStorageDataSnapshot;
  marcosState: MarcosStateSnapshot;
  movesProgression: MovesProgressionSnapshot;
};

/** Bundle completo enviado pelo servidor após login / reconnect. */
export type AuthoritativePlayerSnapshot = {
  readonly revision: number;
  readonly wallet: Omit<WalletSnapshot, 'revision'> & { readonly revision?: number };
  readonly inventory: InventorySnapshot & { readonly revision?: number; readonly inventoryChecksum?: string };
  readonly equipped?: EquippedSlots;
  readonly equipmentUiGrid?: EquipmentUiGridState;
  readonly bankStorage?: Omit<BankStorageDataSnapshot, 'revision'> & { readonly revision?: number };
  readonly marcosState: Omit<MarcosStateSnapshot, 'revision'> & { readonly revision?: number };
  readonly movesProgression?: MovesProgressionData & { readonly revision?: number };
  readonly petRoster?: Omit<PetRosterDataSnapshot, 'revision'> & { readonly revision?: number };
  readonly petAffinity?: Omit<PetAffinityStateSnapshot, 'revision'> & { readonly revision?: number };
  readonly ownedSkins?: Record<
    import('./character/playerSkin.js').SkinSlotId,
    readonly string[]
  >;
  /** Segundos no ciclo dia/noite [0, 1800) — referência do TimeManager. */
  readonly gameTime?: number;
  /** Timestamp do servidor ao capturar gameTime (interpolação no cliente). */
  readonly gameTimeServerMs?: number;
};
