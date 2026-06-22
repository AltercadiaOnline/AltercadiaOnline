import { resolveRamificacaoFromContext } from '../shared/progression/milestoneTreeState.js';
import {
  attachRevision,
  compareRevision,
  resolveIncomingRevision,
} from '../shared/snapshotRevision.js';
import type {
  ApplySnapshotResult,
  IAuthoritativeDataStore,
  IDataStore,
} from '../shared/IDataStore.js';
import type { AuthoritativePositionDelta } from '../shared/world/movementIntent.js';
import type { PlayerFacing } from '../shared/world/playerFacing.js';
import {
  applyCharacterXpGain,
  getCharacterXpForNextLevel,
} from '../shared/character/characterLevelProgression.js';
import type {
  AuthoritativePlayerSnapshot,
  BankStorageDataSnapshot,
  CharacterLevelSnapshot,
  DataStoreSlice,
  DataStoreSliceSnapshot,
  InventoryDataSnapshot,
  MarcosStateSnapshot,
  PlayerDataSnapshot,
  WalletSnapshot,
  WorldPositionSnapshot,
} from '../shared/playerDataSnapshots.js';
import { uiEvents, UIEventType } from './ui/uiEvents.js';
import { getPlayerProfileStore } from './ui/character/playerProfileStore.js';
import { getPlayerEquipmentStore } from './ui/equipment/playerEquipmentStore.js';
import type { InventorySnapshot } from '../shared/character/inventorySlots.js';
import type { InventoryStack } from '../shared/character/equipmentState.js';
import type { BankCurrencyBalances } from '../shared/bank/bankTypes.js';
import { BANK_ITEM_SLOT_CAPACITY } from '../shared/bank/bankConstants.js';
import { buildBankStorageView } from '../shared/bank/bankService.js';
import { totalMasteryXpFromSnapshot } from '../shared/progression/moveProgression.js';
import { ensureMovesetMasteryForClass } from '../shared/progression/movesetMasterySeed.js';
import {
  readMoveProgression,
  readMovesProgressionSnapshot,
} from './progression/movesProgressionReader.js';
import { getPlayerProgressionStore } from './progression/playerProgressionStore.js';
import {
  applyInventoryUpdatedPayload,
  applyServerItemBundle,
  stacksFromInventorySnapshot,
  verifyInventoryIntegrityAfterHydrate,
} from './game/PlayerItemSession.js';
import { getPlayerItemStore } from './ui/items/playerItemStore.js';
import { getPlayerMarcosStore } from './ui/marcos/playerMarcosStore.js';
import { getPlayerWalletStore } from './ui/wallet/playerWalletStore.js';
import { getPlayerPetStore } from './ui/pet/playerPetStore.js';

type SliceRevisions = Record<DataStoreSlice, number>;

export type {
  CharacterLevelListenerMeta,
  CharacterXpSource,
} from '../shared/character/characterLevelTypes.js';
import type {
  CharacterLevelListenerMeta,
  CharacterXpSource,
} from '../shared/character/characterLevelTypes.js';

/** Implementação local — delega aos stores; valida revision em snapshots autoritativos. */
export class PlayerDataStore implements IAuthoritativeDataStore {
  private readonly sliceRevisions: SliceRevisions = {
    characterLevel: 0,
    wallet: 0,
    inventory: 0,
    bankStorage: 0,
    marcosState: 0,
    movesProgression: 0,
  };

  private characterLevel = 1;

  private characterXpCurrent = 0;

  private readonly characterLevelListeners = new Set<
    (snapshot: CharacterLevelSnapshot, meta: CharacterLevelListenerMeta) => void
  >();

  private globalRevision = 0;

  private petStateRevision = 0;

  private worldPositionRevision = 0;

  private worldMoveSeq = 0;

  private worldPosition: {
    readonly mapId: string;
    readonly x: number;
    readonly y: number;
    readonly facing: PlayerFacing;
  } | null = null;

  private readonly worldPositionListeners = new Set<(snapshot: WorldPositionSnapshot) => void>();

  private bankItemStacks: InventoryStack[] = [];

  private bankCurrencies: BankCurrencyBalances = { dollarVolt: 0, alterCoins: 0 };

  private readonly bankStorageListeners = new Set<(snapshot: BankStorageDataSnapshot) => void>();

  getGlobalRevision(): number {
    return this.globalRevision;
  }

  getRevision(slice: DataStoreSlice): number {
    return this.sliceRevisions[slice];
  }

  getSnapshot(): PlayerDataSnapshot {
    return {
      revision: this.globalRevision,
      characterLevel: this.getCharacterLevel(),
      wallet: this.getWallet(),
      inventory: this.getInventory(),
      bankStorage: this.getBankStorage(),
      marcosState: this.getMarcosState(),
      movesProgression: this.getMovesProgression(),
      worldPosition: this.getWorldPosition(),
    };
  }

  getCharacterLevel(): CharacterLevelSnapshot {
    const level = Math.max(1, Math.floor(this.characterLevel));
    const xpCurrent = Math.max(0, Math.floor(this.characterXpCurrent));
    return attachRevision(
      {
        level,
        xpCurrent,
        xpToNext: getCharacterXpForNextLevel(level),
      },
      this.sliceRevisions.characterLevel,
    );
  }

  /**
   * Concede XP de personagem — PVE, quests, exploração, etc.
   * Domínio de moveset não passa por aqui.
   */
  grantCharacterXp(amount: number, source: CharacterXpSource): CharacterLevelListenerMeta {
    const previousLevel = Math.max(1, Math.floor(this.characterLevel));
    const applied = applyCharacterXpGain(
      { level: this.characterLevel, xpCurrent: this.characterXpCurrent },
      amount,
    );
    return this.commitCharacterLevel(
      { level: applied.level, xpCurrent: applied.xpCurrent },
      source,
      previousLevel,
      applied.levelsGained,
    );
  }

  /** Estado absoluto após espelho autoritativo (ex.: grant de batalha). */
  applyCharacterLevelState(
    level: number,
    xpCurrent: number,
    source: CharacterXpSource,
  ): CharacterLevelListenerMeta {
    const previousLevel = Math.max(1, Math.floor(this.characterLevel));
    const safeLevel = Math.max(1, Math.floor(level));
    const safeXp = Math.max(0, Math.floor(xpCurrent));
    return this.commitCharacterLevel(
      { level: safeLevel, xpCurrent: safeXp },
      source,
      previousLevel,
      safeLevel - previousLevel,
    );
  }

  subscribeCharacterLevel(
    listener: (snapshot: CharacterLevelSnapshot, meta: CharacterLevelListenerMeta) => void,
  ): () => void {
    this.characterLevelListeners.add(listener);
    listener(this.getCharacterLevel(), {
      previousLevel: this.characterLevel,
      levelsGained: 0,
      source: 'server_sync',
    });
    return () => this.characterLevelListeners.delete(listener);
  }

  getWorldPosition(): WorldPositionSnapshot | null {
    if (!this.worldPosition) return null;
    return attachRevision(
      {
        mapId: this.worldPosition.mapId,
        x: this.worldPosition.x,
        y: this.worldPosition.y,
        facing: this.worldPosition.facing,
        moveSeq: this.worldMoveSeq,
      },
      this.worldPositionRevision,
    );
  }

  subscribeWorldPosition(listener: (snapshot: WorldPositionSnapshot) => void): () => void {
    this.worldPositionListeners.add(listener);
    const current = this.getWorldPosition();
    if (current) listener(current);
    return () => this.worldPositionListeners.delete(listener);
  }

  applyWorldSpawnFromServer(payload: {
    readonly currentMapId: string;
    readonly lastPosition: { readonly x: number; readonly y: number };
    readonly facing: PlayerFacing;
  }): ApplySnapshotResult {
    this.worldMoveSeq = 0;
    this.worldPositionRevision += 1;
    this.worldPosition = {
      mapId: payload.currentMapId,
      x: payload.lastPosition.x,
      y: payload.lastPosition.y,
      facing: payload.facing,
    };
    this.syncGlobalRevision();
    this.notifyWorldPosition();
    return 'applied';
  }

  applyWorldPositionFromServer(delta: AuthoritativePositionDelta): ApplySnapshotResult {
    if (delta.moveSeq !== undefined && delta.moveSeq <= this.worldMoveSeq) {
      return 'duplicate';
    }

    if (delta.moveSeq !== undefined) {
      this.worldMoveSeq = delta.moveSeq;
    }
    this.worldPositionRevision += 1;
    this.worldPosition = {
      mapId: delta.mapId,
      x: delta.x,
      y: delta.y,
      facing: delta.facing,
    };
    this.syncGlobalRevision();
    this.notifyWorldPosition();
    return 'applied';
  }

  getWallet(): WalletSnapshot {
    const base = getPlayerWalletStore().getSnapshot();
    return attachRevision(base, this.sliceRevisions.wallet);
  }

  getInventory(): InventoryDataSnapshot {
    const base = getPlayerItemStore().getInventorySnapshot();
    return attachRevision(base, this.sliceRevisions.inventory);
  }

  getBankStorage(): BankStorageDataSnapshot {
    const view = buildBankStorageView(this.bankItemStacks, this.bankCurrencies);
    return attachRevision(
      {
        itemStacks: view.itemStacks,
        currencies: view.currencies,
        itemCapacity: view.itemCapacity,
        itemsUsed: view.itemsUsed,
        voltsFormatted: view.voltsFormatted,
        alterFormatted: view.alterFormatted,
      },
      this.sliceRevisions.bankStorage,
    );
  }

  getMarcosState(): MarcosStateSnapshot {
    const marcos = getPlayerMarcosStore().getSnapshot();
    const progression = getPlayerProgressionStore().getSnapshot();
    return attachRevision(
      {
        activeMarcos: marcos.activeMarcos,
        flowSpeedBase: marcos.flowSpeedBase,
        milestoneTotalProgress: progression.milestoneTotalProgress,
        ramificacaoSelecionada: resolveRamificacaoFromContext(progression.ramificacaoSelecionada),
        trilhaTravada: progression.trilhaTravada,
        nodeProgression: marcos.nodeProgression,
      },
      this.sliceRevisions.marcosState,
    );
  }

  getMovesProgression() {
    return readMovesProgressionSnapshot(this.sliceRevisions.movesProgression);
  }

  getMoveProgression(moveId: string) {
    return readMoveProgression(moveId, this.sliceRevisions.movesProgression);
  }

  applyWalletFromServer(
    data: Omit<WalletSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult {
    const incoming = resolveIncomingRevision(this.sliceRevisions.wallet, revision);
    const decision = compareRevision(this.sliceRevisions.wallet, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    getPlayerWalletStore().applyServerWallet({
      playerId: 'local',
      dollarVolt: data.dollarVolt,
      alterCoins: data.alterCoins,
    });
    this.sliceRevisions.wallet = incoming;
    this.syncGlobalRevision();
    return 'applied';
  }

  applyBankStorageFromServer(
    data: Omit<BankStorageDataSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult {
    const incoming = resolveIncomingRevision(this.sliceRevisions.bankStorage, revision);
    const decision = compareRevision(this.sliceRevisions.bankStorage, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    this.bankItemStacks = data.itemStacks.map((row) => ({ ...row }));
    this.bankCurrencies = { ...data.currencies };
    this.sliceRevisions.bankStorage = incoming;
    this.syncGlobalRevision();
    this.notifyBankStorage();
    return 'applied';
  }

  applyInventoryFromServer(inventory: InventorySnapshot, revision?: number): ApplySnapshotResult {
    const incoming = resolveIncomingRevision(this.sliceRevisions.inventory, revision);
    const decision = compareRevision(this.sliceRevisions.inventory, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    applyServerItemBundle({
      stacks: stacksFromInventorySnapshot(inventory.slots),
      inventoryOnly: true,
    });
    this.sliceRevisions.inventory = incoming;
    this.syncGlobalRevision();
    return 'applied';
  }

  applyMarcosStateFromServer(
    state: Omit<MarcosStateSnapshot, 'revision'>,
    revision?: number,
  ): ApplySnapshotResult {
    const incoming = resolveIncomingRevision(this.sliceRevisions.marcosState, revision);
    const decision = compareRevision(this.sliceRevisions.marcosState, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    const progression = getPlayerProgressionStore();
    if (state.ramificacaoSelecionada) {
      progression.setRamificacaoSelecionada(state.ramificacaoSelecionada);
    } else {
      progression.clearMarcosTrailSelection();
    }
    progression.setTrilhaTravada(state.trilhaTravada);
    progression.loadFromProgressionData({
      milestoneTotalProgress: state.milestoneTotalProgress,
    });

    getPlayerMarcosStore().applyAuthoritativeSnapshot(
      state.activeMarcos,
      state.flowSpeedBase,
      state.nodeProgression,
    );

    this.sliceRevisions.marcosState = incoming;
    this.syncGlobalRevision();
    return 'applied';
  }

  applyPetStateFromServer(
    petRoster?: AuthoritativePlayerSnapshot['petRoster'],
    petAffinity?: AuthoritativePlayerSnapshot['petAffinity'],
  ): ApplySnapshotResult {
    if (!petRoster && !petAffinity) return 'duplicate';

    const incoming = resolveIncomingRevision(
      this.petStateRevision,
      petRoster?.revision ?? petAffinity?.revision,
    );
    const decision = compareRevision(this.petStateRevision, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    const petStore = getPlayerPetStore();
    const currentAffinity = petStore.getPetAffinitySnapshot();
    petStore.applyPetStateFromServer({
      roster: petRoster
        ? {
            pets: petRoster.pets.map((pet) => ({ ...pet })),
            activeSlotIndex: petRoster.activeSlotIndex,
            selectedSlotIndex: petRoster.selectedSlotIndex,
          }
        : petStore.getRosterInternal(),
      affinity: petAffinity ?? currentAffinity,
    });

    this.petStateRevision = incoming;
    this.syncGlobalRevision();
    return 'applied';
  }

  applyFullState(state: AuthoritativePlayerSnapshot): ApplySnapshotResult {
    const bundleDecision = compareRevision(this.globalRevision, state.revision);
    if (bundleDecision === 'discard') return 'discarded';
    if (bundleDecision === 'duplicate') return 'duplicate';

    this.applyWalletFromServer(state.wallet, state.wallet.revision);
    if (state.bankStorage) {
      this.applyBankStorageFromServer(state.bankStorage, state.bankStorage.revision);
    }
    this.applyMarcosStateFromServer(state.marcosState, state.marcosState.revision);
    if (state.movesProgression) {
      this.applyMovesProgressionFromServer(state.movesProgression, state.movesProgression.revision);
    }

    const incoming = resolveIncomingRevision(this.sliceRevisions.inventory, state.inventory.revision);
    const inventoryDecision = compareRevision(this.sliceRevisions.inventory, incoming);
    if (inventoryDecision !== 'discard' && inventoryDecision !== 'duplicate') {
      applyServerItemBundle({
        stacks: stacksFromInventorySnapshot(state.inventory.slots),
        equipped: state.equipped ?? {},
        ...(state.equipmentUiGrid !== undefined
          ? { equipmentUiGrid: state.equipmentUiGrid }
          : {}),
        immediate: true,
      });
      verifyInventoryIntegrityAfterHydrate(state.inventory.inventoryChecksum);
      this.sliceRevisions.inventory = incoming;
    }

    if (state.petRoster || state.petAffinity) {
      this.applyPetStateFromServer(state.petRoster, state.petAffinity);
    }

    this.globalRevision = state.revision;
    return 'applied';
  }

  /** Restaura snapshot capturado antes de PendingAction — força revisões à frente do estado atual. */
  restoreAuthoritativeSnapshot(state: AuthoritativePlayerSnapshot): void {
    const bumped = this.bumpSnapshotRevisionsForRestore(state);
    this.applyFullState(bumped);
  }

  private bumpSnapshotRevisionsForRestore(
    state: AuthoritativePlayerSnapshot,
  ): AuthoritativePlayerSnapshot {
    const nextRevision = (current: number, incoming?: number): number =>
      Math.max(current + 1, (incoming ?? current) + 1);

    return {
      ...state,
      revision: nextRevision(this.globalRevision, state.revision),
      wallet: {
        ...state.wallet,
        revision: nextRevision(this.sliceRevisions.wallet, state.wallet.revision),
      },
      inventory: {
        ...state.inventory,
        revision: nextRevision(this.sliceRevisions.inventory, state.inventory.revision),
      },
      ...(state.bankStorage
        ? {
            bankStorage: {
              ...state.bankStorage,
              revision: nextRevision(this.sliceRevisions.bankStorage, state.bankStorage.revision),
            },
          }
        : {}),
      marcosState: {
        ...state.marcosState,
        revision: nextRevision(this.sliceRevisions.marcosState, state.marcosState.revision),
      },
      ...(state.movesProgression
        ? {
            movesProgression: {
              ...state.movesProgression,
              revision: nextRevision(
                this.sliceRevisions.movesProgression,
                state.movesProgression.revision,
              ),
            },
          }
        : {}),
      ...(state.petRoster
        ? {
            petRoster: {
              ...state.petRoster,
              revision: nextRevision(this.petStateRevision, state.petRoster.revision),
            },
          }
        : {}),
      ...(state.petAffinity
        ? {
            petAffinity: {
              ...state.petAffinity,
              revision: nextRevision(this.petStateRevision, state.petAffinity.revision),
            },
          }
        : {}),
    };
  }

  applyMovesProgressionFromServer(
    data: AuthoritativePlayerSnapshot['movesProgression'],
    revision?: number,
  ): ApplySnapshotResult {
    if (!data) return 'duplicate';

    const incoming = resolveIncomingRevision(this.sliceRevisions.movesProgression, revision);
    const decision = compareRevision(this.sliceRevisions.movesProgression, incoming);
    if (decision === 'discard') return 'discarded';
    if (decision === 'duplicate') return 'duplicate';

    const nextMastery: Record<string, number> = {};
    for (const [moveId, prog] of Object.entries(data.byMoveId)) {
      nextMastery[moveId] = totalMasteryFromResolved(prog);
    }

    const classId = getPlayerEquipmentStore().getSnapshot().classId;
    getPlayerProgressionStore().loadFromProgressionData({
      movesetMastery: ensureMovesetMasteryForClass(nextMastery, classId),
    });
    this.sliceRevisions.movesProgression = incoming;
    this.syncGlobalRevision();
    return 'applied';
  }

  bumpRevision(slice: DataStoreSlice): void {
    this.sliceRevisions[slice] += 1;
    this.syncGlobalRevision();
  }

  subscribe<K extends DataStoreSlice>(
    slice: K,
    listener: (snapshot: DataStoreSliceSnapshot[K]) => void,
  ): () => void {
    switch (slice) {
      case 'characterLevel':
        return this.subscribeCharacterLevel((snapshot) => {
          listener(snapshot as DataStoreSliceSnapshot[K]);
        });
      case 'wallet':
        return getPlayerWalletStore().subscribe(() => {
          listener(this.getWallet() as DataStoreSliceSnapshot[K]);
        });
      case 'inventory':
        return getPlayerItemStore().subscribe(() => {
          listener(this.getInventory() as DataStoreSliceSnapshot[K]);
        });
      case 'bankStorage': {
        const bankListener = listener as (snapshot: BankStorageDataSnapshot) => void;
        this.bankStorageListeners.add(bankListener);
        bankListener(this.getBankStorage());
        return () => this.bankStorageListeners.delete(bankListener);
      }
      case 'marcosState': {
        const notify = (): void => {
          listener(this.getMarcosState() as DataStoreSliceSnapshot[K]);
        };
        const offMarcos = getPlayerMarcosStore().subscribe(notify);
        const offProgression = getPlayerProgressionStore().subscribe(notify);
        notify();
        return () => {
          offMarcos();
          offProgression();
        };
      }
      case 'movesProgression': {
        const notify = (): void => {
          listener(this.getMovesProgression() as DataStoreSliceSnapshot[K]);
        };
        const offProgression = getPlayerProgressionStore().subscribe(notify);
        notify();
        return () => {
          offProgression();
        };
      }
      default: {
        const _exhaustive: never = slice;
        return _exhaustive;
      }
    }
  }

  private notifyBankStorage(): void {
    const snapshot = this.getBankStorage();
    for (const listener of this.bankStorageListeners) {
      listener(snapshot);
    }
  }

  /** Re-emite snapshots econômicos na HUD após transação bancária autoritativa. */
  refreshBankTransactionViews(): void {
    this.notifyBankStorage();
  }

  private notifyWorldPosition(): void {
    const snapshot = this.getWorldPosition();
    if (!snapshot) return;
    for (const listener of this.worldPositionListeners) {
      listener(snapshot);
    }
  }

  private commitCharacterLevel(
    next: { readonly level: number; readonly xpCurrent: number },
    source: CharacterXpSource,
    previousLevel: number,
    levelsGained: number,
  ): CharacterLevelListenerMeta {
    this.characterLevel = next.level;
    this.characterXpCurrent = next.xpCurrent;
    this.sliceRevisions.characterLevel += 1;
    this.syncGlobalRevision();

    const meta: CharacterLevelListenerMeta = {
      previousLevel,
      levelsGained: Math.max(0, levelsGained),
      source,
    };
    const snapshot = this.getCharacterLevel();

    this.syncCharacterLevelMirrors(snapshot);
    this.notifyCharacterLevel(snapshot, meta);

    uiEvents.emit(UIEventType.CHARACTER_LEVEL_UPDATED, { snapshot, meta });
    if (meta.levelsGained > 0) {
      uiEvents.emit(UIEventType.CHARACTER_LEVEL_UP, {
        previousLevel: meta.previousLevel,
        newLevel: snapshot.level,
        levelsGained: meta.levelsGained,
        source: meta.source,
      });
    }

    return meta;
  }

  private syncCharacterLevelMirrors(snapshot: CharacterLevelSnapshot): void {
    getPlayerProfileStore().mirrorCharacterLevel(
      snapshot.level,
      snapshot.xpCurrent,
      snapshot.xpToNext,
    );
    const equipment = getPlayerEquipmentStore().getSnapshot();
    if (equipment.level !== snapshot.level) {
      getPlayerEquipmentStore().setPlayerInfo(equipment.displayName, snapshot.level, {
        resetVitals: false,
      });
    }
  }

  private notifyCharacterLevel(
    snapshot: CharacterLevelSnapshot,
    meta: CharacterLevelListenerMeta,
  ): void {
    for (const listener of this.characterLevelListeners) {
      listener(snapshot, meta);
    }
  }

  private syncGlobalRevision(): void {
    this.globalRevision = Math.max(
      this.sliceRevisions.characterLevel,
      this.sliceRevisions.wallet,
      this.sliceRevisions.inventory,
      this.sliceRevisions.bankStorage,
      this.sliceRevisions.marcosState,
      this.sliceRevisions.movesProgression,
      this.worldPositionRevision,
    );
  }
}

function totalMasteryFromResolved(prog: {
  readonly level: number;
  readonly xp: number;
}): number {
  return totalMasteryXpFromSnapshot(prog);
}

let activeStore: PlayerDataStore | null = null;

export function initDataStore(): void {
  if (!activeStore) activeStore = new PlayerDataStore();
}

export function getDataStore(): IDataStore {
  if (!activeStore) initDataStore();
  return activeStore!;
}

export function getMutableDataStore(): PlayerDataStore {
  if (!activeStore) initDataStore();
  return activeStore!;
}

export function resetDataStore(): void {
  activeStore = null;
}

export type { WorldPositionSnapshot } from '../shared/playerDataSnapshots.js';
