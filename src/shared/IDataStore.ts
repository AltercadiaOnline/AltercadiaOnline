import type {
  AuthoritativePlayerSnapshot,
  CharacterLevelSnapshot,
  DataStoreSlice,
  DataStoreSliceSnapshot,
  InventoryDataSnapshot,
  BankStorageDataSnapshot,
  MarcosStateSnapshot,
  MovesProgressionSnapshot,
  PlayerDataSnapshot,
  WalletSnapshot,
} from './playerDataSnapshots.js';
import type { InventorySnapshot } from './character/inventorySlots.js';
import type { MoveProgressionSnapshot } from './progression/moveProgression.js';

export type ApplySnapshotResult = 'applied' | 'discarded' | 'duplicate';

/**
 * Contrato de leitura do estado do jogador no front-end.
 * Mutations autoritativas passam por apply* / applyFullState (sync layer).
 */
export interface IDataStore {
  getSnapshot(): PlayerDataSnapshot;
  getCharacterLevel(): CharacterLevelSnapshot;
  getWallet(): WalletSnapshot;
  getInventory(): InventoryDataSnapshot;
  getBankStorage(): BankStorageDataSnapshot;
  getMarcosState(): MarcosStateSnapshot;
  getMovesProgression(): MovesProgressionSnapshot;
  getMoveProgression(moveId: string): MoveProgressionSnapshot;
  getRevision(slice: DataStoreSlice): number;
  getGlobalRevision(): number;

  subscribe<K extends DataStoreSlice>(
    slice: K,
    listener: (snapshot: DataStoreSliceSnapshot[K]) => void,
  ): () => void;
}

/** Extensão interna — aplicadores autoritativos (servidor / reconnect). */
export interface IAuthoritativeDataStore extends IDataStore {
  applyWalletFromServer(
    data: Omit<WalletSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult;

  applyInventoryFromServer(inventory: InventorySnapshot, revision?: number): ApplySnapshotResult;

  applyBankStorageFromServer(
    data: Omit<BankStorageDataSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult;

  applyMarcosStateFromServer(
    state: Omit<MarcosStateSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult;

  applyFullState(state: AuthoritativePlayerSnapshot): ApplySnapshotResult;

  applyWorldSpawnFromServer(payload: {
    readonly currentMapId: string;
    readonly lastPosition: { readonly x: number; readonly y: number };
    readonly facing: import('./world/playerFacing.js').PlayerFacing;
  }): ApplySnapshotResult;

  applyWorldPositionFromServer(
    delta: import('./world/movementIntent.js').AuthoritativePositionDelta,
  ): ApplySnapshotResult;

  bumpRevision(slice: DataStoreSlice): void;
}

export type {
  AuthoritativePlayerSnapshot,
  CharacterLevelSnapshot,
  DataStoreSlice,
  DataStoreSliceSnapshot,
  InventoryDataSnapshot,
  BankStorageDataSnapshot,
  MarcosStateSnapshot,
  MovesProgressionSnapshot,
  PlayerDataSnapshot,
  WalletSnapshot,
} from './playerDataSnapshots.js';
export type { MoveProgressionSnapshot } from './progression/moveProgression.js';
