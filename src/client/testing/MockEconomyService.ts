import type { InventoryStack, PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import type { EquipmentUiSlotId } from '../../shared/character/equipmentUiSlots.js';
import {
  buildInventorySnapshot,
  stacksToInventorySlots,
} from '../../shared/character/inventorySlots.js';
import type { SkinSlotId } from '../../shared/character/playerSkin.js';
import {
  getDefaultOwnedSkinIds,
  getSkinShopItem,
  type SkinShopItem,
} from '../../shared/character/skinShopCatalog.js';
import {
  calculateVoltsFromAlterCoins,
  formatAlterCoins,
  formatVolts,
  isValidAlterExchangeAmount,
} from '../../shared/economy/premiumCurrency.js';
import { mirrorWalletCurrencyStacks } from '../../shared/economy/walletCurrencyInventoryMirror.js';
import { findNpcVendorListing } from '../../shared/economy/npcVendorCatalog.js';
import { validateNpcPurchase, validateInventoryItemSale } from '../../shared/economy/npcVendorService.js';
import { validatePetPurchase, buildAdoptedPet } from '../../shared/economy/petTrainerService.js';
import type { PetKindId } from '../../shared/pet/petCatalog.js';
import type { PetGenderId } from '../../shared/pet/petGender.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import {
  clearPetMemorialStorage,
  consumeLegacyPetMemorialMirror,
  getPetMemorialStore,
} from '../ui/pet/petMemorialStore.js';
import { validateInventoryDeleteIntent } from '../../shared/economy/inventoryPolicy.js';
import { isMarketplaceListableItem } from '../../shared/economy/itemValorEconomy.js';
import { getMarketplaceBuyOrderStore, resetMarketplaceBuyOrderStore } from '../ui/market/marketplaceBuyOrderStore.js';
import { getPlayerMarketStore, resetPlayerMarketStore } from '../ui/market/playerMarketStore.js';
import { getItemById } from '../../shared/items/itemCatalog.js';
import { ensureHuntZoneLoaded } from '../../shared/world/worldMonsterInstances.js';
import { getAuthoritativeItemById } from '../../shared/items/itemCatalogAuthoritative.js';
import {
  canChooseMarco,
  canSelectBranchStarter,
  sanitizeActiveMarcosForTrail,
  type MarcoTreePlayerContext,
} from '../../shared/progression/milestoneTreeState.js';
import { resolveRamificacaoFromStarter } from '../../shared/progression/milestoneTreeCatalog.js';
import { applyMarcoProgressEvents } from '../../shared/progression/marcoProgressEngine.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import type { MarcosNodeProgressionData } from '../../shared/progression/marcoProgression.js';
import { attachRevision } from '../../shared/snapshotRevision.js';
import type {
  DataStoreSlice,
  DataStoreSliceSnapshot,
  InventoryDataSnapshot,
  MarcosStateSnapshot,
  MovesProgressionSnapshot,
  PlayerDataSnapshot,
  WalletSnapshot,
} from '../../shared/playerDataSnapshots.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import type { ClientAction } from '../ActionDispatcher.js';
import { getGlobalMessageBus } from '../net/GlobalMessageBus.js';
import {
  executeCaelBuyPetRation,
  executePetFeedSpecialRation,
} from '../pet/caelPetActions.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import type { IDevMockEconomyService, IntentHandleResult } from '../economy/IEconomyService.js';
import {
  clearLocalCharacterSave,
  createLocalEmptySave,
  loadLocalCharacterSave,
  saveLocalCharacterSave,
} from '../persistence/localCharacterSave.js';
import type { CharacterPersistenceRecord } from '../../shared/persistence/characterPersistenceRecord.js';
import { CHARACTER_PERSISTENCE_SCHEMA_VERSION } from '../../shared/persistence/characterPersistenceRecord.js';
import { createDefaultWorldProfile, sanitizePlayerWorldProfile, type PlayerWorldProfile } from '../../shared/world/playerWorldProfile.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { isValidClassActiveLoadout } from '../../shared/combat/movesetLoadout.js';
import {
  ensureMovesetMasteryForClass,
  isClassType,
} from '../../shared/progression/movesetMasterySeed.js';
import type { ClassType } from '../../shared/types/classes.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import {
  clampMoveMasteryXp,
  MOVE_MAX_LEVEL,
  totalMasteryXpForLevel,
} from '../../shared/progression/moveProgression.js';
import { createEmptyPetRoster } from '../../shared/pet/petRoster.js';
import { isLocalGameMode } from '../runtime/gameMode.js';
import { equippedToEquipmentUiGrid } from '../../shared/character/equipmentUiSlots.js';
import {
  readMoveProgression,
  readMovesProgressionSnapshot,
} from '../progression/movesProgressionReader.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { resetPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { alertSystem } from '../ui/alertSystem.js';
import { healPlayer } from '../../shared/world/npcHealService.js';
import { unequipFailureMessage, unequipSlotToInventory } from '../ui/equipment/unequipToInventory.js';
import {
  equipFromInventoryFailureMessage,
  equipInventoryItemToSet,
} from '../ui/equipment/equipFromInventory.js';
import { toggleItemSlot } from '../ui/equipment/toggleItemSlot.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import {
  assertInventoryRemovalPolicyAllowed,
  assertSellItemAllowed,
  validateAddItem,
} from '../../Economy/InventoryService.js';
import { validateSoulboundRetention } from '../../shared/economy/soulboundInventoryPolicy.js';
import { addItemToInventoryStacks } from '../../shared/character/inventoryStackOps.js';
import { stageBattleLoot as gatewayStageBattleLoot } from '../../Economy/economyGateway.js';
import { consumePendingLoot, discardPendingLoot, peekPendingLoot } from '../../Economy/pendingLootStore.js';
import { applyServerItemBundle } from '../game/PlayerItemSession.js';
import { captureBattleLootPreview } from '../combat/client/battleLootBuffer.js';
import { captureBattleLootPackage } from '../combat/client/battleLootPackageBuffer.js';
import { buildBankStorageView, depositCurrencySwap, depositItemSwap, withdrawCurrencySwap, withdrawItemSwap } from '../../shared/bank/bankService.js';
import { validateBankItemTransfer } from '../../shared/bank/bankItemRules.js';
import { validateBankCurrencyRequest } from '../../shared/bank/bankCurrencyRules.js';
import {
  lockInventoryQuantity,
  unlockInventoryQuantity,
} from '../../shared/bank/inventoryLockOps.js';
import { transferCurrency } from '../../shared/bank/bankCurrency.js';
import { BANK_TRANSACTION_SUCCESS_MESSAGE } from '../../shared/bank/bankConstants.js';
import type { BankStorageDataSnapshot } from '../../shared/playerDataSnapshots.js';
import type { BankCurrencyTypeId } from '../../shared/bank/bankConstants.js';
import type { OwnedSkins } from '../ui/character/playerSkinStore.js';
import { getPlayerSkinStore, resetPlayerSkinStore } from '../ui/character/playerSkinStore.js';
import { getPlayerInventoryStore, resetPlayerInventoryStore } from '../ui/inventory/playerInventoryStore.js';
import { getPlayerEquipmentStore, resetPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { refreshHudPlayerHpMax } from '../ui/equipment/playerHudHpMax.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { getPlayerItemStore, resetPlayerItemStore } from '../ui/items/playerItemStore.js';
import { resetInventorySyncScheduler } from '../game/PlayerItemSession.js';
import { getPlayerMarcosStore, resetPlayerMarcosStore } from '../ui/marcos/playerMarcosStore.js';
import { getPlayerWalletStore, resetPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';
import { getGameStore } from '../state/GameStore.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import { stripRetiredInventoryStacks } from '../../shared/items/retiredItems.js';

const DEFAULT_NETWORK_DELAY_MS = 420;

type MockWallet = {
  dollarVolt: number;
  alterCoins: number;
};

type MockMarcosState = {
  activeMarcos: string[];
  flowSpeedBase: number;
  milestoneTotalProgress: number;
  ramificacaoSelecionada: MarcosStateSnapshot['ramificacaoSelecionada'];
  trilhaTravada: boolean;
  nodeProgression: MarcosNodeProgressionData;
};

type MockBankState = {
  itemStacks: InventoryStack[];
  currencies: { dollarVolt: number; alterCoins: number };
};

type MockInternalState = {
  wallet: MockWallet;
  inventoryStacks: InventoryStack[];
  marcos: MockMarcosState;
  bank: MockBankState;
  ownedSkins: OwnedSkins;
};

function cloneOwnedSkins(owned: OwnedSkins): OwnedSkins {
  return {
    hair: [...owned.hair],
    shirt: [...owned.shirt],
    pants: [...owned.pants],
    shoes: [...owned.shoes],
  };
}

function createInitialState(): MockInternalState {
  return {
    wallet: { dollarVolt: 0, alterCoins: 0 },
    inventoryStacks: [],
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      milestoneTotalProgress: 0,
      ramificacaoSelecionada: null,
      trilhaTravada: false,
      nodeProgression: emptyMarcosNodeProgression(),
    },
    bank: { itemStacks: [], currencies: { dollarVolt: 0, alterCoins: 0 } },
    ownedSkins: cloneOwnedSkins(getDefaultOwnedSkinIds()),
  };
}

/** Simula servidor autoritativo com atraso de rede — implementa IDataStore. */
export class MockEconomyService implements IDevMockEconomyService {
  private state: MockInternalState = createInitialState();
  private boundPlayerId: string | null = null;
  private boundCharacterId: number | null = null;
  private readonly sliceRevisions: Record<DataStoreSlice, number> = {
    characterLevel: 0,
    wallet: 0,
    inventory: 0,
    bankStorage: 0,
    marcosState: 0,
    movesProgression: 0,
  };

  private globalRevision = 0;
  private networkDelayMs = DEFAULT_NETWORK_DELAY_MS;
  private pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  private readonly walletListeners = new Set<(snapshot: WalletSnapshot) => void>();
  private readonly inventoryListeners = new Set<(snapshot: InventoryDataSnapshot) => void>();
  private readonly bankStorageListeners = new Set<(snapshot: BankStorageDataSnapshot) => void>();

  private bankTransactionPending = false;
  private petCharacterPersistUnsub: (() => void) | null = null;
  private petMemorialPersistUnsub: (() => void) | null = null;
  /** Posição/mapa hidratados do save — atualizado por snapshot live no persist. */
  private cachedWorldProfile: PlayerWorldProfile = createDefaultWorldProfile();
  private worldSnapshotProvider:
    | (() => {
        readonly mapId: string;
        readonly x: number;
        readonly y: number;
        readonly facing: PlayerFacing;
      } | null)
    | null = null;
  private readonly marcosListeners = new Set<(snapshot: MarcosStateSnapshot) => void>();
  private readonly movesProgressionListeners = new Set<
    (snapshot: MovesProgressionSnapshot) => void
  >();

  setNetworkDelayMs(ms: number): void {
    this.networkDelayMs = Math.max(0, ms);
  }

  getGlobalRevision(): number {
    return this.globalRevision;
  }

  getRevision(slice: DataStoreSlice): number {
    return this.sliceRevisions[slice];
  }

  getBankStorage(): BankStorageDataSnapshot {
    const view = buildBankStorageView(this.state.bank.itemStacks, this.state.bank.currencies);
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

  getCharacterLevel() {
    return getMutableDataStore().getCharacterLevel();
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
      worldPosition: null,
    };
  }

  getWallet(): WalletSnapshot {
    const snap = getPlayerWalletStore().getSnapshot();
    return attachRevision(
      {
        dollarVolt: snap.dollarVolt,
        alterCoins: snap.alterCoins,
        voltsFormatted: snap.voltsFormatted,
        alterFormatted: snap.alterFormatted,
      },
      this.sliceRevisions.wallet,
    );
  }

  getInventory(): InventoryDataSnapshot {
    const slots = stacksToInventorySlots(this.state.inventoryStacks);
    const snapshot = buildInventorySnapshot(slots);
    return attachRevision(snapshot, this.sliceRevisions.inventory);
  }

  getMarcosState(): MarcosStateSnapshot {
    return attachRevision({ ...this.state.marcos }, this.sliceRevisions.marcosState);
  }

  getMovesProgression() {
    return readMovesProgressionSnapshot(this.sliceRevisions.movesProgression);
  }

  getMoveProgression(moveId: string) {
    return readMoveProgression(moveId, this.sliceRevisions.movesProgression);
  }

  subscribe<K extends DataStoreSlice>(
    slice: K,
    listener: (snapshot: DataStoreSliceSnapshot[K]) => void,
  ): () => void {
    switch (slice) {
      case 'characterLevel':
        return getMutableDataStore().subscribe(slice, listener);
      case 'wallet': {
        const walletListener = listener as (snapshot: WalletSnapshot) => void;
        this.walletListeners.add(walletListener);
        walletListener(this.getWallet());
        return () => this.walletListeners.delete(walletListener);
      }
      case 'inventory': {
        const inventoryListener = listener as (snapshot: InventoryDataSnapshot) => void;
        this.inventoryListeners.add(inventoryListener);
        inventoryListener(this.getInventory());
        return () => this.inventoryListeners.delete(inventoryListener);
      }
      case 'bankStorage': {
        const bankListener = listener as (snapshot: BankStorageDataSnapshot) => void;
        this.bankStorageListeners.add(bankListener);
        bankListener(this.getBankStorage());
        return () => this.bankStorageListeners.delete(bankListener);
      }
      case 'marcosState': {
        const marcosListener = listener as (snapshot: MarcosStateSnapshot) => void;
        this.marcosListeners.add(marcosListener);
        marcosListener(this.getMarcosState());
        return () => this.marcosListeners.delete(marcosListener);
      }
      case 'movesProgression': {
        const movesListener = listener as (snapshot: MovesProgressionSnapshot) => void;
        const notify = (): void => {
          movesListener(this.getMovesProgression());
        };
        this.movesProgressionListeners.add(movesListener);
        const offProgression = getPlayerProgressionStore().subscribe(notify);
        notify();
        return () => {
          this.movesProgressionListeners.delete(movesListener);
          offProgression();
        };
      }
      default: {
        const _exhaustive: never = slice;
        return _exhaustive;
      }
    }
  }

  handleIntent(action: ClientAction, intentId: string): void {
    if (
      action.type === 'UNEQUIP_TO_INVENTORY'
      || action.type === 'EQUIP_FROM_INVENTORY'
      || action.type === 'EQUIP_ITEM'
      || action.type === 'STAGE_BATTLE_LOOT'
      || action.type === 'SELECT_MARCO_BRANCH'
      || action.type === 'CHOOSE_MARCO'
      || action.type === 'RESET_MARCO_TRAIL'
      || action.type === 'DEV_GRANT_ITEM'
      || action.type === 'DEV_GRANT_CURRENCY'
      || action.type === 'DEV_SET_LEVEL'
      || action.type === 'DEV_SET_MOVESET_MASTERY'
      || action.type === 'DEV_RESET_PLAYER'
    ) {
      this.applyIntentNow(action, intentId);
      return;
    }

    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      try {
        const result = this.processAction(action);
        if (result.ok) {
          this.syncLegacyStores();
          this.notifyAll();
          this.persistLocalSave();
          getActionDispatcher().confirmIntent(intentId);
        } else {
          getActionDispatcher().rejectIntent(intentId);
          alertSystem(result.reason);
        }
      } catch (error) {
        console.error('[MockEconomyService] Falha ao processar intent:', action.type, error);
        getActionDispatcher().rejectIntent(intentId);
        alertSystem('Falha na transação local. Tente novamente.');
      }
    }, this.networkDelayMs);

    this.pendingTimers.add(timer);
  }

  /** Inventário/equipamento — HUD já mutou playerItemStore; mock só espelha stacks. */
  private applyIntentNow(action: ClientAction, intentId: string): void {
    const isItemMutation =
      action.type === 'EQUIP_ITEM'
      || action.type === 'EQUIP_FROM_INVENTORY'
      || action.type === 'UNEQUIP_TO_INVENTORY';

    if (isItemMutation) {
      this.syncInventoryStacksFromClient(getPlayerItemStore().toInventoryStacks(), false);
      this.persistLocalSave();
      getActionDispatcher().confirmIntent(intentId);
      return;
    }

    const result = this.processAction(action);
    if (result.ok) {
      this.syncLegacyStores();
      this.notifyAll();
      this.persistLocalSave();
      getActionDispatcher().confirmIntent(intentId);
      return;
    }

    getActionDispatcher().rejectIntent(intentId);
    alertSystem(result.reason);
  }

  requestFullState(): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      this.syncLegacyStores();
      this.notifyAll();
    }, this.networkDelayMs);
    this.pendingTimers.add(timer);
  }

  reset(): void {
    for (const timer of this.pendingTimers) clearTimeout(timer);
    this.pendingTimers.clear();

    resetPlayerWalletStore();
    resetPlayerInventoryStore();
    resetPlayerEquipmentStore();
    resetInventorySyncScheduler();
    resetPlayerItemStore();
    resetPlayerMarcosStore();
    resetPlayerProgressionStore();
    resetPlayerSkinStore();
    resetPlayerMarketStore();
    resetMarketplaceBuyOrderStore();

    this.state = createInitialState();
    this.sliceRevisions.characterLevel = 0;
    this.sliceRevisions.wallet = 0;
    this.sliceRevisions.inventory = 0;
    this.sliceRevisions.bankStorage = 0;
    this.sliceRevisions.marcosState = 0;
    this.sliceRevisions.movesProgression = 0;
    this.globalRevision = 0;

    this.syncLegacyStores();
    this.notifyAll();
  }

  bindLocalCharacter(
    playerId: string,
    characterId: number,
    options?: { readonly displayName?: string; readonly classId?: ClassType },
  ): void {
    this.boundPlayerId = playerId;
    this.boundCharacterId = characterId;

    const hubClassId = isClassType(options?.classId) ? options.classId : undefined;
    const loaded = loadLocalCharacterSave(playerId, characterId);
    let record = loaded ?? createLocalEmptySave(playerId, characterId, {
      ...(options?.displayName ? { displayName: options.displayName } : {}),
      ...(hubClassId ? { classId: hubClassId } : {}),
    });

    // Hub é SSOT da classe na criação — corrige save local sem classId ou com IMPETUS residual.
    if (hubClassId && record.characterProfile.classId !== hubClassId) {
      record = {
        ...record,
        characterProfile: {
          ...record.characterProfile,
          classId: hubClassId,
        },
        progression: {
          ...record.progression,
          movesetMastery: ensureMovesetMasteryForClass(
            record.progression.movesetMastery,
            hubClassId,
          ),
        },
      };
    }

    this.applyPersistenceRecord(record);
    this.ensurePetCharacterPersistBridge();
    this.ensurePetMemorialPersistBridge();

    const migratedLegacyPets = this.migrateLegacyPetRosterIfNeeded(record);
    const migratedLegacyAffinity = this.migrateLegacyPetAffinityIfNeeded(record);
    const migratedLegacyMemorial = this.migrateLegacyPetMemorialIfNeeded(record);
    const classLinked = Boolean(hubClassId && loaded && loaded.characterProfile.classId !== hubClassId);
    if (
      (!loaded || migratedLegacyPets || migratedLegacyAffinity || migratedLegacyMemorial || classLinked)
      && isLocalGameMode()
    ) {
      this.persistLocalSave();
    }
    // UI React (Zustand) só espelha GameStore — marca hidratado após save local.
    getGameStore().markHydrated();
    getGameStore().syncPlayerFromDomain();
    console.info('[LocalSave] Personagem ligado', {
      playerId,
      characterId,
      classId: getPlayerEquipmentStore().getSnapshot().classId,
      source: loaded ? 'localStorage' : 'empty',
      inventoryStacks: record.economy.inventory.length,
      volts: record.wallet.dollarVolt,
      pets: getPlayerPetStore().getRoster().pets.length,
      saveKey: `altercadia.localSave.v2:${playerId}:${characterId}`,
    });
  }

  persistLocalSave(): boolean {
    if (!isLocalGameMode()) return false;
    if (!this.boundPlayerId || this.boundCharacterId === null) {
      console.warn('[LocalSave] persistLocalSave ignorado — personagem ainda não ligado.', {
        pets: getPlayerPetStore().getRoster().pets.length,
      });
      return false;
    }
    // Carteira pode ter sido mutada via ActionDispatcher.dispatchLocal (wallet store).
    this.syncWalletFromStore();
    const ok = saveLocalCharacterSave(this.buildPersistenceRecord());
    if (!ok) {
      console.warn('[LocalSave] Falha ao gravar CharacterPersistenceRecord (pets inclusos).', {
        playerId: this.boundPlayerId,
        characterId: this.boundCharacterId,
      });
    }
    return ok;
  }

  clearLocalSave(): void {
    if (!this.boundPlayerId || this.boundCharacterId === null) return;
    clearLocalCharacterSave(this.boundPlayerId, this.boundCharacterId);
    clearPetMemorialStorage(this.boundPlayerId, this.boundCharacterId);
  }

  /**
   * Exploration registra o snapshot live — evita world default no save local.
   * Provider retorna null se o mundo ainda não estiver montado.
   */
  setLocalWorldSnapshotProvider(
    provider: (() => {
      readonly mapId: string;
      readonly x: number;
      readonly y: number;
      readonly facing: PlayerFacing;
    } | null) | null,
  ): void {
    this.worldSnapshotProvider = provider;
  }

  private resolveWorldProfileForSave(): PlayerWorldProfile {
    const live = this.worldSnapshotProvider?.() ?? null;
    const stored = getMutableDataStore().getWorldPosition();
    const base: PlayerWorldProfile = live
      ? {
          currentMapId: live.mapId,
          lastPosition: { x: live.x, y: live.y },
          facing: live.facing,
        }
      : stored
        ? {
            currentMapId: stored.mapId,
            lastPosition: { x: stored.x, y: stored.y },
            facing: stored.facing,
          }
        : {
            currentMapId: this.cachedWorldProfile.currentMapId,
            lastPosition: { ...this.cachedWorldProfile.lastPosition },
            facing: this.cachedWorldProfile.facing,
          };

    const global = getGlobalPlayerStore();
    const itemStore = getPlayerItemStore();
    const pet = getPlayerPetStore().getSnapshot();
    const equipmentUiGrid = itemStore.toEquipmentGrid();

    this.cachedWorldProfile = {
      ...base,
      sessionSync: {
        worldVitals: { ...global.getWorldVitals() },
        activeMovesets: [...global.getConfirmedLoadout()],
        ...(pet ? { pet: { ...pet } } : { pet: null }),
      },
      loadout: {
        equipmentUiGrid,
        equipped: itemStore.getEquippedSlots(),
      },
    };
    return this.cachedWorldProfile;
  }

  private buildPersistenceRecord(): CharacterPersistenceRecord {
    const playerId = this.boundPlayerId ?? 'local-player';
    const characterId = this.boundCharacterId ?? 1;
    const equipment = getPlayerEquipmentStore().getSnapshot();
    const progression = getPlayerProgressionStore().getSnapshot();
    const itemStore = getPlayerItemStore();
    const levelState = getMutableDataStore().getCharacterLevel();
    const world = this.resolveWorldProfileForSave();

    return {
      schemaVersion: CHARACTER_PERSISTENCE_SCHEMA_VERSION,
      playerId,
      characterId,
      updatedAt: Date.now(),
      wallet: {
        dollarVolt: this.state.wallet.dollarVolt,
        alterCoins: this.state.wallet.alterCoins,
        lockedDollarVolt: 0,
        lockedAlterCoins: 0,
      },
      economy: {
        inventory: this.state.inventoryStacks.map((row) => ({ ...row })),
        equipped: itemStore.getEquippedSlots(),
        activeBookBuff: null,
        bank: {
          itemStacks: this.state.bank.itemStacks.map((row) => ({ ...row })),
          currencies: { ...this.state.bank.currencies },
        },
      },
      world: {
        currentMapId: world.currentMapId,
        lastPosition: { ...world.lastPosition },
        facing: world.facing,
        ...(world.sessionSync !== undefined ? { sessionSync: world.sessionSync } : {}),
        ...(world.loadout !== undefined ? { loadout: world.loadout } : {}),
      },
      progression: {
        movesetMastery: { ...progression.movesetMastery },
        milestoneTotalProgress: progression.milestoneTotalProgress,
        ramificacaoSelecionada: progression.ramificacaoSelecionada,
        trilhaTravada: progression.trilhaTravada,
      },
      marcos: {
        activeMarcos: [...this.state.marcos.activeMarcos],
        flowSpeedBase: this.state.marcos.flowSpeedBase,
        nodeProgression: {
          byNodeId: { ...this.state.marcos.nodeProgression.byNodeId },
        },
      },
      characterProfile: {
        level: Math.max(1, levelState.level || equipment.level),
        xpCurrent: Math.max(0, levelState.xpCurrent),
        displayName: equipment.displayName,
        classId: equipment.classId,
      },
      petRoster: getPlayerPetStore().getRoster(),
      petAffinity: getPlayerPetStore().getPetAffinitySnapshot(),
      petMemorial: getPetMemorialStore().getEntries(),
      ownedSkins: cloneOwnedSkins(this.state.ownedSkins),
    };
  }

  /**
   * Uma vez por sessão: qualquer mutação de pet (roster/afinidade) grava no mesmo
   * CharacterPersistenceRecord do personagem ligado (playerId + characterId).
   */
  private ensurePetCharacterPersistBridge(): void {
    if (this.petCharacterPersistUnsub) return;
    this.petCharacterPersistUnsub = getPlayerPetStore().registerCharacterPersistHandler(() => {
      if (!isLocalGameMode() || this.boundCharacterId === null) return;
      this.persistLocalSave();
    });
  }

  private ensurePetMemorialPersistBridge(): void {
    if (this.petMemorialPersistUnsub) return;
    this.petMemorialPersistUnsub = getPetMemorialStore().registerCharacterPersistHandler(() => {
      if (!isLocalGameMode() || this.boundCharacterId === null) return;
      this.persistLocalSave();
    });
  }

  /**
   * Migra pets do localStorage global legado (`altercadia.playerPetRoster.v1`)
   * para o save por personagem — evita perda após a unificação.
   */
  private migrateLegacyPetRosterIfNeeded(record: CharacterPersistenceRecord): boolean {
    const current = getPlayerPetStore().getRoster();
    if (current.pets.length > 0) return false;
    if (record.petRoster && record.petRoster.pets.length > 0) return false;

    const legacy = getPlayerPetStore().consumeLegacyRosterMirror();
    if (!legacy || legacy.pets.length === 0) return false;

    getPlayerPetStore().hydrateFromStorage(legacy);
    getPlayerPetStore().notifyHydrated();
    return true;
  }

  /** Migra afinidade/rações globais legadas → slice do personagem. */
  private migrateLegacyPetAffinityIfNeeded(record: CharacterPersistenceRecord): boolean {
    const slice = record.petAffinity;
    const recordHasAffinity = Boolean(
      slice
      && (slice.rationCharges > 0
        || slice.lastPetAffectionAtMs !== null
        || slice.lastPetRationFeedAtMs !== null),
    );
    if (recordHasAffinity) return false;

    const legacy = getPlayerPetStore().consumeLegacyAffinityMirror();
    if (!legacy) return false;
    getPlayerPetStore().applyPetAffinityFromServer(legacy);
    return true;
  }

  /**
   * Migra livro de memórias global legado (`altercadia.petMemorialBook.v1`)
   * para o save do personagem ligado — um companion = um personagem.
   */
  private migrateLegacyPetMemorialIfNeeded(record: CharacterPersistenceRecord): boolean {
    if (getPetMemorialStore().getEntries().length > 0) return false;
    if (record.petMemorial && record.petMemorial.length > 0) return false;

    const legacy = consumeLegacyPetMemorialMirror();
    if (!legacy || legacy.length === 0) return false;

    getPetMemorialStore().hydrateFromEntries(legacy);
    return true;
  }

  private applyPersistenceRecord(record: CharacterPersistenceRecord): void {
    this.state = {
      wallet: {
        dollarVolt: record.wallet.dollarVolt,
        alterCoins: record.wallet.alterCoins,
      },
      inventoryStacks: stripRetiredInventoryStacks(record.economy.inventory).map((row) => ({
        ...row,
      })),
      marcos: {
        activeMarcos: [...record.marcos.activeMarcos],
        flowSpeedBase: record.marcos.flowSpeedBase,
        milestoneTotalProgress: record.progression.milestoneTotalProgress,
        ramificacaoSelecionada: record.progression.ramificacaoSelecionada,
        trilhaTravada: record.progression.trilhaTravada,
        nodeProgression: {
          byNodeId: { ...record.marcos.nodeProgression.byNodeId },
        },
      },
      bank: {
        itemStacks: stripRetiredInventoryStacks(record.economy.bank.itemStacks).map((row) => ({
          ...row,
        })),
        currencies: { ...record.economy.bank.currencies },
      },
      ownedSkins: record.ownedSkins
        ? cloneOwnedSkins(record.ownedSkins as OwnedSkins)
        : cloneOwnedSkins(getDefaultOwnedSkinIds()),
    };

    const level = Math.max(1, record.characterProfile.level);
    const xpCurrent = Math.max(0, Math.floor(record.characterProfile.xpCurrent ?? 0));
    const name = record.characterProfile.displayName?.trim() || 'Operative';
    const savedVitals = record.world.sessionSync?.worldVitals;

    getPlayerEquipmentStore().setPlayerInfo(name, level, {
      resetVitals: !savedVitals,
      ...(record.characterProfile.classId
        ? { classId: record.characterProfile.classId }
        : {}),
    });
    getPlayerProfileStore().setProfile(name, level);
    getMutableDataStore().applyCharacterLevelState(level, xpCurrent, 'server_sync');

    const safeWorld = sanitizePlayerWorldProfile(record.world);
    this.cachedWorldProfile = {
      currentMapId: safeWorld.currentMapId,
      lastPosition: { ...safeWorld.lastPosition },
      facing: safeWorld.facing,
      ...(safeWorld.sessionSync !== undefined ? { sessionSync: safeWorld.sessionSync } : {}),
      ...(safeWorld.loadout !== undefined ? { loadout: safeWorld.loadout } : {}),
    };

    getMutableDataStore().applyWorldSpawnFromServer({
      currentMapId: safeWorld.currentMapId,
      lastPosition: { ...safeWorld.lastPosition },
      facing: safeWorld.facing,
    });

    const equipmentUiGrid =
      record.world.loadout?.equipmentUiGrid
      ?? equippedToEquipmentUiGrid(record.economy.equipped);

    applyServerItemBundle({
      stacks: this.state.inventoryStacks,
      equipped: record.economy.equipped,
      equipmentUiGrid,
      immediate: true,
    });

    const global = getGlobalPlayerStore();
    const classId =
      record.characterProfile.classId
      ?? getPlayerEquipmentStore().getSnapshot().classId;
    global.ensureClassMovePool(classId);
    const savedMoves = record.world.sessionSync?.activeMovesets;
    if (savedMoves && savedMoves.length > 0) {
      global.hydrateConfirmedLoadout(savedMoves, classId);
    }
    if (savedVitals) {
      global.applyWorldVitals({
        hpCurrent: savedVitals.hpCurrent,
        hpMax: savedVitals.hpMax,
        mpCurrent: savedVitals.mpCurrent,
        mpMax: savedVitals.mpMax,
      });
    }

    getPlayerPetStore().hydrateFromStorage(record.petRoster ?? createEmptyPetRoster());
    getPlayerPetStore().applyPetAffinityFromServer({
      rationCharges: record.petAffinity?.rationCharges ?? 0,
      lastPetRationFeedAtMs: record.petAffinity?.lastPetRationFeedAtMs ?? null,
      lastPetAffectionAtMs: record.petAffinity?.lastPetAffectionAtMs ?? null,
    });
    getPetMemorialStore().bindCharacter(
      record.playerId,
      record.characterId,
      record.petMemorial,
    );
    getPlayerProgressionStore().loadFromProgressionData({
      ...createDefaultPlayerProgressionData(),
      ...record.progression,
      movesetMastery: { ...record.progression.movesetMastery },
    });

    this.syncLegacyStores();
    this.mirrorBankAuthorityToDataStore();
    this.notifyAll();
    // Notifica HUD de pets após hidratar (sem gravar — bridge ainda pode não existir).
    getPlayerPetStore().notifyHydrated();
  }

  private processAction(action: ClientAction): IntentHandleResult {
    switch (action.type) {
      case 'EXCHANGE_ALTER_FOR_VOLTS':
        return this.exchangeAlter(action.payload.alterAmount);
      case 'SELECT_MARCO_BRANCH':
        return this.selectMarcoBranch(action.payload.starterNodeId);
      case 'CHOOSE_MARCO':
        return this.chooseMarco(action.payload.nodeId);
      case 'RESET_MARCO_TRAIL':
        return this.resetMarcoTrail();
      case 'DEPOSIT_ITEM':
        return this.depositItem(action.payload.itemId, action.payload.quantity);
      case 'WITHDRAW_ITEM':
        return this.withdrawItem(action.payload.itemId, action.payload.quantity);
      case 'DEPOSIT_CURRENCY':
        return this.depositCurrency(action.payload.currency, action.payload.amount);
      case 'WITHDRAW_CURRENCY':
        return this.withdrawCurrency(action.payload.currency, action.payload.amount);
      case 'PURCHASE_SKIN':
        return this.purchaseSkin(action.payload.slot, action.payload.optionId);
      case 'PURCHASE_NPC_ITEM':
        return this.purchaseNpcItem(
          action.payload.vendorId,
          action.payload.itemId,
          action.payload.quantity,
        );
      case 'PURCHASE_PET':
        return this.purchasePet(
          action.payload.vendorId,
          action.payload.kindId,
          action.payload.name,
          action.payload.colorId,
          action.payload.gender,
        );
      case 'SELL_NPC_ITEM':
        return this.sellNpcItem(
          action.payload.vendorId,
          action.payload.itemId,
          action.payload.quantity,
        );
      case 'DELETE_ITEM':
        return this.deleteInventoryItem(
          action.payload.itemId,
          action.payload.quantity,
        );
      case 'PROGRESS_MARCO':
        return this.progressMarco(action.payload.events);
      case 'HEAL_AT_NPC':
        return this.healAtNpc(action.payload);
      case 'CAEL_BUY_PET_RATION': {
        const buyResult = executeCaelBuyPetRation(action.payload.npcId);
        if (!buyResult.ok) return buyResult;
        alertSystem(buyResult.message);
        return { ok: true };
      }
      case 'PET_FEED_SPECIAL_RATION': {
        const feedResult = executePetFeedSpecialRation(action.payload.slotIndex);
        if (!feedResult.ok) return feedResult;
        return { ok: true };
      }
      case 'PET_SELECT_SLOT':
        getPlayerPetStore().selectPetSlot(action.payload.slotIndex);
        return { ok: true };
      case 'PET_ACTIVATE_SLOT':
        if (!getPlayerPetStore().activatePetSlot(action.payload.slotIndex)) {
          return { ok: false, reason: 'Não foi possível convocar este companheiro.' };
        }
        return { ok: true };
      case 'PET_DEACTIVATE':
        getPlayerPetStore().deactivateAllPets();
        return { ok: true };
      case 'PET_APPLY_AFFECTION': {
        const affection = getPlayerPetStore().applyPetAffection();
        if (!affection.ok) return { ok: false, reason: affection.reason };
        return { ok: true };
      }
      case 'GIFT_TRANSFER':
        return { ok: false, reason: 'Presentes requerem servidor online.' };
      case 'REFRACTION_BOOTH_QUOTE':
      case 'REFRACTION_BOOTH_START':
      case 'REFRACTION_BOOTH_COMPLETE':
        return { ok: false, reason: 'Estande de Refração requer servidor online.' };
      case 'STAGE_BATTLE_LOOT':
        return this.stageBattleLoot(
          action.payload.battleId,
          action.payload.sourceId,
          action.payload.defeatedLevel,
        );
      case 'COLLECT_BATTLE_LOOT':
        return this.collectBattleLoot(action.payload.lootId);
      case 'DISMISS_BATTLE_LOOT':
        return this.dismissBattleLoot(action.payload.lootId);
      case 'CREATE_MARKET_LISTING':
        return this.createMarketListing(
          action.payload.itemId,
          action.payload.quantity,
          action.payload.unitPriceVolts,
          action.payload.anonymous ?? false,
        );
      case 'CREATE_MARKET_BUY_ORDER':
        return this.createMarketBuyOrder(
          action.payload.itemId,
          action.payload.quantity,
          action.payload.unitPriceVolts,
          action.payload.anonymous ?? false,
        );
      case 'COLLECT_MARKET_VOLTS':
        return this.collectMarketVolts(action.payload.listingId);
      case 'CANCEL_MARKET_LISTING':
        return this.cancelMarketListing(action.payload.listingId);
      case 'CANCEL_MARKET_BUY_ORDER':
        return this.cancelMarketBuyOrder(action.payload.orderId);
      case 'EXECUTE_MARKET_PURCHASE':
        return { ok: false, reason: 'Compra P2P requer servidor online.' };
      case 'EQUIP_ITEM': {
        const toggle = toggleItemSlot(action.payload.itemId, action.payload.slot);
        if (!toggle.ok) {
          return { ok: false, reason: toggle.reason };
        }
        return { ok: true };
      }
      case 'EQUIP_FROM_INVENTORY':
        return this.equipFromInventory(action.payload.itemId, action.payload.uiSlotId);
      case 'UNEQUIP_TO_INVENTORY':
        return this.unequipToInventory(action.payload.slotId);
      case 'SYNC_LOADOUT':
        return { ok: false, reason: 'Mock aplica equip local — SYNC_LOADOUT não é necessário.' };
      case 'SYNC_MOVESET': {
        const classId = getPlayerEquipmentStore().getSnapshot().classId;
        const moves = action.payload.activeMovesets;
        if (!isValidClassActiveLoadout(classId, moves)) {
          return { ok: false, reason: 'Loadout inválido para a classe.' };
        }
        getGlobalPlayerStore().hydrateConfirmedLoadout(moves);
        return { ok: true };
      }
      case 'ZONE_ENSURE': {
        ensureHuntZoneLoaded(action.payload.mapId);
        return { ok: true };
      }
      case 'MOVE_INTENT':
        return { ok: false, reason: 'Movimento de exploração usa WorldSocket no mock.' };
      case 'ROTATE_INTENT':
        return { ok: false, reason: 'Pivot usa WorldSocket no mock.' };
      case 'CRAFT_ITEM':
        return { ok: false, reason: 'Craft requer servidor online (CraftItemHandler).' };
      case 'ACTIVATE_BOOK':
        return { ok: false, reason: 'Ativação de livro requer servidor online.' };
      case 'DEV_GRANT_ITEM': {
        const itemId = action.payload.itemId;
        if (!getItemById(itemId)) {
          return { ok: false, reason: `Item desconhecido: ${itemId}` };
        }
        const quantity = Math.max(1, Math.floor(action.payload.quantity ?? 1));
        const result = addItemToInventoryStacks(this.state.inventoryStacks, itemId, quantity);
        if (result.added <= 0) {
          return { ok: false, reason: result.overflow > 0 ? 'Inventário cheio.' : 'Falha ao adicionar.' };
        }
        this.state.inventoryStacks = result.stacks.map((row) => ({ ...row }));
        this.bumpRevision('inventory');
        this.syncInventoryToPlayerItemStore();
        getGameStore().syncPlayerFromDomain();
        return { ok: true };
      }
      case 'DEV_GRANT_CURRENCY': {
        const volts = Math.max(0, Math.floor(action.payload.volts ?? 0));
        const alterCoins = Math.max(0, Math.floor(action.payload.alterCoins ?? 0));
        if (volts === 0 && alterCoins === 0) {
          return { ok: false, reason: 'Informe volts e/ou alterCoins.' };
        }
        this.commitWallet({
          dollarVolt: this.state.wallet.dollarVolt + volts,
          alterCoins: this.state.wallet.alterCoins + alterCoins,
        });
        return { ok: true };
      }
      case 'DEV_SET_LEVEL': {
        const level = Math.max(1, Math.min(999, Math.floor(action.payload.level)));
        getPlayerEquipmentStore().setPlayerInfo(
          getPlayerEquipmentStore().getSnapshot().displayName,
          level,
        );
        getPlayerProfileStore().setLevel(level);
        getMutableDataStore().applyCharacterLevelState(level, 0, 'server_sync');
        refreshHudPlayerHpMax();
        this.bumpRevision('characterLevel');
        return { ok: true };
      }
      case 'DEV_SET_MOVESET_MASTERY': {
        const moveId = action.payload.moveId.trim();
        if (!moveId) return { ok: false, reason: 'Informe o moveId.' };
        const level = Math.max(1, Math.min(MOVE_MAX_LEVEL, Math.floor(action.payload.level)));
        const masteryXp = clampMoveMasteryXp(totalMasteryXpForLevel(level));
        getPlayerProgressionStore().setMoveMasteryXp(moveId, masteryXp);
        this.bumpRevision('movesProgression');
        return { ok: true };
      }
      case 'DEV_RESET_PLAYER': {
        this.clearLocalSave();
        this.state = createInitialState();
        this.bumpRevision('wallet');
        this.bumpRevision('inventory');
        this.bumpRevision('bankStorage');
        this.bumpRevision('marcosState');
        this.bumpRevision('characterLevel');
        this.commitWallet(this.state.wallet);
        applyServerItemBundle({
          stacks: [],
          inventoryOnly: true,
          immediate: true,
        });
        for (const listener of this.inventoryListeners) listener(this.getInventory());
        for (const listener of this.bankStorageListeners) listener(this.getBankStorage());
        getPlayerPetStore().reset();
        getPlayerEquipmentStore().setPlayerInfo(
          getPlayerEquipmentStore().getSnapshot().displayName,
          1,
          { resetVitals: true },
        );
        getPlayerProfileStore().setLevel(1);
        this.persistLocalSave();
        return { ok: true };
      }
      case 'CHAT_GLOBAL_SEND': {
        if (!getGlobalMessageBus().applyLocalChat(action.payload.text)) {
          return { ok: false, reason: 'Não foi possível enviar a mensagem.' };
        }
        return { ok: true };
      }
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  private exchangeAlter(alterAmount: number): IntentHandleResult {
    if (!isValidAlterExchangeAmount(alterAmount)) {
      return { ok: false, reason: 'Quantidade inválida de Alter Coins.' };
    }
    if (this.state.wallet.alterCoins < alterAmount) {
      return { ok: false, reason: 'Alter Coins insuficientes.' };
    }

    const voltsGain = calculateVoltsFromAlterCoins(alterAmount);
    this.commitWallet({
      alterCoins: this.state.wallet.alterCoins - alterAmount,
      dollarVolt: this.state.wallet.dollarVolt + voltsGain,
    });
    return { ok: true };
  }

  private selectMarcoBranch(starterNodeId: string): IntentHandleResult {
    const ctx = this.buildMarcoContext();
    if (!canSelectBranchStarter(starterNodeId, ctx)) {
      return { ok: false, reason: 'Não foi possível escolher esta trilha.' };
    }

    const ramificacao = resolveRamificacaoFromStarter(starterNodeId);
    if (!ramificacao) {
      return { ok: false, reason: 'Trilha inválida.' };
    }

    this.state.marcos.ramificacaoSelecionada = ramificacao;
    this.state.marcos.trilhaTravada = true;
    // Trava a trilha e liga o 1º nível (starter) — confirmação só no botão de cima.
    this.state.marcos.activeMarcos = [starterNodeId];
    this.bumpRevision('marcosState');
    return { ok: true };
  }

  private chooseMarco(nodeId: string): IntentHandleResult {
    // Repara save legado (trilha travada sem starter) antes de liberar o 2º nó.
    const repaired = sanitizeActiveMarcosForTrail(
      this.state.marcos.activeMarcos,
      this.state.marcos.ramificacaoSelecionada,
      this.state.marcos.trilhaTravada,
    );
    if (
      repaired.length !== this.state.marcos.activeMarcos.length
      || repaired.some((id, i) => id !== this.state.marcos.activeMarcos[i])
    ) {
      this.state.marcos.activeMarcos = repaired;
    }

    if (!canChooseMarco(nodeId, this.buildMarcoContext())) {
      return { ok: false, reason: 'Marco indisponível ou requisitos pendentes.' };
    }
    const next = sanitizeActiveMarcosForTrail(
      this.state.marcos.activeMarcos.includes(nodeId)
        ? this.state.marcos.activeMarcos
        : [...this.state.marcos.activeMarcos, nodeId],
      this.state.marcos.ramificacaoSelecionada,
      this.state.marcos.trilhaTravada,
    );
    this.state.marcos.activeMarcos = next;
    this.bumpRevision('marcosState');
    return { ok: true };
  }

  private resetMarcoTrail(): IntentHandleResult {
    this.state.marcos = {
      activeMarcos: [],
      flowSpeedBase: 35,
      milestoneTotalProgress: 18,
      ramificacaoSelecionada: null,
      trilhaTravada: false,
      nodeProgression: emptyMarcosNodeProgression(),
    };
    this.bumpRevision('marcosState');
    return { ok: true };
  }

  private progressMarco(
    events: ReadonlyArray<{ readonly trigger: import('../../shared/progression/marcoProgressCatalog.js').MarcoProgressTriggerId; readonly count: number }>,
  ): IntentHandleResult {
    if (events.length === 0) {
      return { ok: false, reason: 'Nenhum evento de progressão informado.' };
    }

    const result = applyMarcoProgressEvents(
      this.state.marcos.nodeProgression,
      this.state.marcos.activeMarcos,
      events,
    );

    if (Object.keys(result.xpGainedByNode).length === 0) {
      return { ok: false, reason: 'Nenhum marco ativo recebeu progressão.' };
    }

    this.state.marcos = {
      ...this.state.marcos,
      nodeProgression: result.progression,
    };
    this.bumpRevision('marcosState');
    return { ok: true };
  }

  private emitBankTransactionSuccess(): void {
    this.mirrorBankAuthorityToDataStore();
    const bank = this.getBankStorage();
    uiEvents.emit(UIEventType.BANK_STORAGE_UPDATED, {
      revision: this.sliceRevisions.bankStorage,
    });
    uiEvents.emit(UIEventType.BANK_BALANCE_UPDATED, {
      dollarVolt: bank.currencies.dollarVolt,
      alterCoins: bank.currencies.alterCoins,
      voltsFormatted: bank.voltsFormatted,
      alterFormatted: bank.alterFormatted,
      revision: this.sliceRevisions.bankStorage,
    });
    uiEvents.emit(UIEventType.BANK_UPDATE_SUCCESS, {
      message: BANK_TRANSACTION_SUCCESS_MESSAGE,
    });
    uiEvents.emit(UIEventType.BANK_TRANSACTION_SUCCESS, {
      message: BANK_TRANSACTION_SUCCESS_MESSAGE,
    });
    if (typeof document !== 'undefined') {
      alertSystem(BANK_TRANSACTION_SUCCESS_MESSAGE);
    }
  }

  /**
   * React HUD lê PlayerDataStore — sem este espelho o cofre local fica vazio
   * e a UI de moeda parece travada após depósito.
   */
  private mirrorBankAuthorityToDataStore(): void {
    const bank = this.getBankStorage();
    getMutableDataStore().applyBankStorageFromServer({
      itemStacks: bank.itemStacks.map((row) => ({ ...row })),
      currencies: { ...bank.currencies },
      itemCapacity: bank.itemCapacity,
      itemsUsed: bank.itemsUsed,
      voltsFormatted: bank.voltsFormatted,
      alterFormatted: bank.alterFormatted,
    });
    getMutableDataStore().applyWalletFromServer({
      dollarVolt: this.state.wallet.dollarVolt,
      alterCoins: this.state.wallet.alterCoins,
      voltsFormatted: formatVolts(this.state.wallet.dollarVolt),
      alterFormatted: formatAlterCoins(this.state.wallet.alterCoins),
    });
    getMutableDataStore().refreshBankTransactionViews();
  }

  private emitBankTransactionFailure(reason: string): void {
    uiEvents.emit(UIEventType.BANK_TRANSACTION_FAILED, { message: reason });
  }

  private depositItem(itemId: string, quantity = 1): IntentHandleResult {
    if (this.bankTransactionPending) {
      return { ok: false, reason: 'Aguarde a conclusão da transação bancária anterior.' };
    }
    this.bankTransactionPending = true;
    const qty = Math.max(1, Math.floor(quantity));
    let lockedQty = 0;

    try {
      const locked = lockInventoryQuantity(this.state.inventoryStacks, itemId, qty);
      if (!locked.ok) {
        this.emitBankTransactionFailure(locked.reason);
        return { ok: false, reason: locked.reason };
      }
      lockedQty = qty;
      this.state.inventoryStacks = locked.stacks;
      this.bumpRevision('inventory');

      const rules = validateBankItemTransfer(itemId, qty);
      if (!rules.ok) {
        this.emitBankTransactionFailure(rules.reason);
        return { ok: false, reason: rules.reason };
      }

      const result = depositItemSwap(this.state.inventoryStacks, this.state.bank.itemStacks, itemId, qty);
      if (!result.ok) {
        this.emitBankTransactionFailure(result.reason);
        return { ok: false, reason: result.reason };
      }

      this.state.inventoryStacks = result.value.inventoryStacks;
      this.state.bank.itemStacks = result.value.bankStacks;
      this.bumpRevision('inventory');
      this.bumpRevision('bankStorage');
      lockedQty = 0;
      applyServerItemBundle({
        stacks: this.state.inventoryStacks.map((row) => ({ ...row })),
        inventoryOnly: true,
        immediate: true,
      });
      this.emitBankTransactionSuccess();
      return { ok: true };
    } finally {
      if (lockedQty > 0) {
        this.state.inventoryStacks = unlockInventoryQuantity(this.state.inventoryStacks, itemId, lockedQty);
        this.bumpRevision('inventory');
        applyServerItemBundle({
          stacks: this.state.inventoryStacks.map((row) => ({ ...row })),
          inventoryOnly: true,
          immediate: true,
        });
      }
      this.bankTransactionPending = false;
    }
  }

  private withdrawItem(itemId: string, quantity = 1): IntentHandleResult {
    if (this.bankTransactionPending) {
      return { ok: false, reason: 'Aguarde a conclusão da transação bancária anterior.' };
    }
    this.bankTransactionPending = true;

    try {
      const qty = Math.max(1, Math.floor(quantity));
      const rules = validateBankItemTransfer(itemId, qty);
      if (!rules.ok) {
        this.emitBankTransactionFailure(rules.reason);
        return { ok: false, reason: rules.reason };
      }

      const result = withdrawItemSwap(
        this.state.inventoryStacks,
        this.state.bank.itemStacks,
        itemId,
        qty,
      );
      if (!result.ok) {
        this.emitBankTransactionFailure(result.reason);
        return { ok: false, reason: result.reason };
      }

      this.state.inventoryStacks = result.value.inventoryStacks;
      this.state.bank.itemStacks = result.value.bankStacks;
      this.bumpRevision('inventory');
      this.bumpRevision('bankStorage');
      applyServerItemBundle({
        stacks: this.state.inventoryStacks.map((row) => ({ ...row })),
        inventoryOnly: true,
        immediate: true,
      });
      this.emitBankTransactionSuccess();
      return { ok: true };
    } finally {
      this.bankTransactionPending = false;
    }
  }

  private depositCurrency(currency: BankCurrencyTypeId, amount: number): IntentHandleResult {
    if (this.bankTransactionPending) {
      return { ok: false, reason: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    const validated = validateBankCurrencyRequest(currency, amount);
    if (!validated.ok) {
      this.emitBankTransactionFailure(validated.reason);
      return { ok: false, reason: validated.reason };
    }

    this.bankTransactionPending = true;

    try {
      const kind = validated.currency === 'volts' ? 'volts' : 'coins';
      const result = transferCurrency(
        validated.amount,
        'wallet',
        kind,
        this.state.wallet,
        this.state.bank.currencies,
      );
      if (!result.ok) {
        this.emitBankTransactionFailure(result.reason);
        return { ok: false, reason: result.reason };
      }

      this.state.wallet = { ...result.value.wallet };
      this.state.bank.currencies = { ...result.value.bankCurrencies };
      this.commitWallet(this.state.wallet);
      this.bumpRevision('bankStorage');
      this.emitBankTransactionSuccess();
      return { ok: true };
    } finally {
      this.bankTransactionPending = false;
    }
  }

  private withdrawCurrency(currency: BankCurrencyTypeId, amount: number): IntentHandleResult {
    if (this.bankTransactionPending) {
      return { ok: false, reason: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    const validated = validateBankCurrencyRequest(currency, amount);
    if (!validated.ok) {
      this.emitBankTransactionFailure(validated.reason);
      return { ok: false, reason: validated.reason };
    }

    this.bankTransactionPending = true;

    try {
      const kind = validated.currency === 'volts' ? 'volts' : 'coins';
      const result = transferCurrency(
        validated.amount,
        'vault',
        kind,
        this.state.wallet,
        this.state.bank.currencies,
      );
      if (!result.ok) {
        this.emitBankTransactionFailure(result.reason);
        return { ok: false, reason: result.reason };
      }

      this.state.wallet = { ...result.value.wallet };
      this.state.bank.currencies = { ...result.value.bankCurrencies };
      this.commitWallet(this.state.wallet);
      this.bumpRevision('bankStorage');
      this.emitBankTransactionSuccess();
      return { ok: true };
    } finally {
      this.bankTransactionPending = false;
    }
  }

  private healAtNpc(payload: {
    readonly npcId: string;
    readonly clientVitals?: PlayerWorldVitals;
  }): IntentHandleResult {
    // Alinha hpMax com buffs do SET antes de curar (ex.: até 112, não 100).
    refreshHudPlayerHpMax();
    const equipment = getPlayerEquipmentStore().getSnapshot();
    const vitals = payload.clientVitals ?? getGlobalPlayerStore().getWorldVitals();
    const result = healPlayer({
      npcId: payload.npcId,
      playerLevel: equipment.level,
      walletVolts: this.state.wallet.dollarVolt,
      vitals: {
        ...vitals,
        hpMax: equipment.vitals.hpMax,
        mpMax: equipment.vitals.mpMax,
      },
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    this.commitWallet({
      dollarVolt: result.walletVolts,
      alterCoins: this.state.wallet.alterCoins,
    });
    getGlobalPlayerStore().applyWorldVitals(result.vitals);

    if (result.voltsCost > 0) {
      uiEvents.emit(UIEventType.VOLTS_SPENT, {
        amount: result.voltsCost,
        formatted: `−${formatVolts(result.voltsCost)}`,
      });
    }

    alertSystem(result.message);
    return { ok: true };
  }

  private static readonly MOCK_WINNER_ID = 'mock-player';

  private stageBattleLoot(
    battleId: string,
    sourceId: string,
    defeatedLevel?: number,
  ): IntentHandleResult {
    const staged = gatewayStageBattleLoot({
      sourceId,
      winnerId: MockEconomyService.MOCK_WINNER_ID,
      characterId: 1,
      defeatedLevel: defeatedLevel ?? 1,
    });
    if (!staged) {
      return { ok: false, reason: 'Fonte de loot desconhecida.' };
    }

    captureBattleLootPreview(staged.preview);
    captureBattleLootPackage({
      battleId,
      lootId: staged.preview.lootId,
      lootReveal: staged.lootReveal,
      lootPreview: staged.preview,
    });
    return { ok: true };
  }

  private unequipToInventory(slotId: EquipmentUiSlotId): IntentHandleResult {
    const result = unequipSlotToInventory(slotId);
    if (!result.ok) {
      return { ok: false, reason: unequipFailureMessage(result.reason) };
    }
    return { ok: true };
  }

  private equipFromInventory(itemId: string, uiSlotId?: EquipmentUiSlotId): IntentHandleResult {
    const result = equipInventoryItemToSet(itemId, uiSlotId);
    if (!result.ok) {
      return { ok: false, reason: equipFromInventoryFailureMessage(result.reason) };
    }
    return { ok: true };
  }

  private lastBattleLootDiscardedQuantity = 0;

  consumeLastBattleLootDiscardedQuantity(): number {
    const discarded = this.lastBattleLootDiscardedQuantity;
    this.lastBattleLootDiscardedQuantity = 0;
    return discarded;
  }

  private collectBattleLoot(lootId: string): IntentHandleResult {
    const pending = peekPendingLoot(lootId);
    if (!pending) {
      return { ok: false, reason: 'Saque indisponível ou expirado.' };
    }

    // Mock clássico (STAGE via ActionDispatcher) ou LocalCombatAuthority (winnerId local_*).
    const allowedWinner =
      pending.winnerId === MockEconomyService.MOCK_WINNER_ID
      || pending.winnerId.startsWith('local_');
    if (!allowedWinner) {
      return { ok: false, reason: 'Saque indisponível ou expirado.' };
    }

    this.lastBattleLootDiscardedQuantity = 0;

    if (pending.voltReward > 0) {
      this.commitWallet({
        dollarVolt: this.state.wallet.dollarVolt + pending.voltReward,
        alterCoins: this.state.wallet.alterCoins,
      });
    }

    for (const row of pending.items) {
      const result = addItemToInventoryStacks(
        this.state.inventoryStacks,
        row.itemId,
        row.quantity,
      );
      this.state.inventoryStacks = result.stacks;
      this.lastBattleLootDiscardedQuantity += result.overflow;
      if (result.added > 0) {
        this.bumpRevision('inventory');
      }
    }

    consumePendingLoot(lootId, pending.winnerId);

    applyServerItemBundle({
      stacks: this.state.inventoryStacks.map((row) => ({ ...row })),
      inventoryOnly: true,
    });

    return { ok: true };
  }

  private dismissBattleLoot(lootId: string): IntentHandleResult {
    discardPendingLoot(lootId);
    return { ok: true };
  }

  private addInventoryItem(itemId: string, quantity: number): void {
    const amount = Math.max(1, Math.floor(quantity));
    const addCheck = validateAddItem(itemId, this.state.inventoryStacks, amount);
    if (!addCheck.ok) return;

    const stackIndex = this.state.inventoryStacks.findIndex((stack) => stack.itemId === itemId);
    if (stackIndex >= 0) {
      this.state.inventoryStacks = this.state.inventoryStacks.map((stack, index) =>
        index === stackIndex ? { ...stack, quantity: stack.quantity + amount } : stack,
      );
    } else {
      this.state.inventoryStacks = [...this.state.inventoryStacks, { itemId, quantity: amount }];
    }
    this.bumpRevision('inventory');
  }

  private purchaseSkin(slot: SkinSlotId, optionId: string): IntentHandleResult {
    const item = getSkinShopItem(slot, optionId);
    if (!item) return { ok: false, reason: 'Item de loja inválido.' };
    return this.purchaseSkinItem(item);
  }

  private purchaseSkinItem(item: SkinShopItem): IntentHandleResult {
    if (this.state.ownedSkins[item.slot].includes(item.optionId)) {
      return { ok: false, reason: 'Você já possui esta peça.' };
    }
    if (this.state.wallet.dollarVolt < item.price) {
      return { ok: false, reason: 'DOLLAR VOLT insuficiente.' };
    }

    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt - item.price,
      alterCoins: this.state.wallet.alterCoins,
    });
    const owned = cloneOwnedSkins(this.state.ownedSkins);
    owned[item.slot] = [...owned[item.slot], item.optionId];
    this.state.ownedSkins = owned;
    return { ok: true };
  }

  private syncInventoryToPlayerItemStore(): void {
    applyServerItemBundle({
      stacks: this.state.inventoryStacks.map((row) => ({ ...row })),
      inventoryOnly: true,
      immediate: true,
    });
    for (const listener of this.inventoryListeners) {
      listener(this.getInventory());
    }
  }

  private purchaseNpcItem(vendorId: string, itemId: string, quantity: number): IntentHandleResult {
    const listing = findNpcVendorListing(vendorId, itemId);
    if (!listing) {
      return { ok: false, reason: 'Item indisponível nesta loja.' };
    }

    const validation = validateNpcPurchase({
      listing,
      quantity,
      walletVolts: this.state.wallet.dollarVolt,
    });
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const addCheck = validateAddItem(
      itemId,
      this.state.inventoryStacks,
      validation.quote.quantity,
    );
    if (!addCheck.ok) {
      return { ok: false, reason: addCheck.reason ?? 'Inventário cheio.' };
    }

    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt - validation.quote.totalVolts,
      alterCoins: this.state.wallet.alterCoins,
    });
    this.addInventoryItem(itemId, validation.quote.quantity);
    this.bumpRevision('inventory');
    this.syncInventoryToPlayerItemStore();
    alertSystem(`Comprou ${validation.quote.quantity}× ${validation.quote.itemLabel}.`);
    return { ok: true };
  }

  private purchasePet(
    vendorId: string,
    kindId: PetKindId,
    name: string,
    colorId: import('../../shared/pet/petColorPalette.js').PetColorId,
    gender: PetGenderId,
  ): IntentHandleResult {
    if (!this.boundPlayerId || this.boundCharacterId === null) {
      return {
        ok: false,
        reason: 'Personagem ainda não ligado ao save — tente entrar no mundo novamente.',
      };
    }

    const petStore = getPlayerPetStore();
    const validation = validatePetPurchase({
      vendorId,
      kindId,
      name,
      colorId,
      gender,
      walletVolts: this.state.wallet.dollarVolt,
      ownedPetCount: petStore.getRoster().pets.length,
    });
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt - validation.quote.priceVolts,
      alterCoins: this.state.wallet.alterCoins,
    });
    const adopted = buildAdoptedPet(validation.adoption);
    if (!petStore.adoptPet(adopted.kindId, {
      name: adopted.name,
      colorId: adopted.colorId,
      gender: adopted.gender,
    })) {
      return { ok: false, reason: 'Roster de companheiros cheio.' };
    }
    alertSystem(`${validation.quote.name} adotado com sucesso!`);
    return { ok: true };
  }

  private sellNpcItem(vendorId: string, itemId: string, quantity: number): IntentHandleResult {
    void vendorId;
    // Espelha o inventário da HUD (playerItemStore) antes de validar — evita dessync com stacks do mock.
    this.syncInventoryStacksFromClient(getPlayerItemStore().toInventoryStacks(), false);

    try {
      assertSellItemAllowed(itemId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Item não pode ser vendido.';
      return { ok: false, reason };
    }

    const owned = this.countInventoryItem(itemId);
    const validation = validateInventoryItemSale({
      itemId,
      quantity,
      inventoryQuantity: owned,
    });
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    this.removeInventoryItem(itemId, validation.quote.quantity);
    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt + validation.quote.totalVolts,
      alterCoins: this.state.wallet.alterCoins,
    });
    this.bumpRevision('inventory');
    this.syncInventoryToPlayerItemStore();
    getGameStore().syncPlayerFromDomain();
    alertSystem(
      `Vendeu ${validation.quote.quantity}× ${validation.quote.itemLabel} por ${formatVolts(validation.quote.totalVolts)}.`,
    );
    return { ok: true };
  }

  private deleteInventoryItem(itemId: string, quantity?: number): IntentHandleResult {
    const qty = Math.max(1, Math.floor(quantity ?? 1));
    const policy = validateInventoryDeleteIntent({
      itemId,
      quantity: qty,
      inventoryStacks: this.state.inventoryStacks,
    });
    if (!policy.ok) {
      return { ok: false, reason: policy.reason };
    }

    this.removeInventoryItem(itemId, qty);
    this.bumpRevision('inventory');
    this.syncInventoryToPlayerItemStore();
    const label = getItemById(itemId)?.name ?? itemId;
    alertSystem(`Descartou ${qty}× ${label}.`);
    return { ok: true };
  }

  private createMarketListing(
    itemId: string,
    quantity: number,
    unitPriceVolts: number,
    anonymous: boolean,
  ): IntentHandleResult {
    const soulbound = validateSoulboundRetention(itemId);
    if (!soulbound.ok) {
      return { ok: false, reason: soulbound.reason };
    }

    if (!isMarketplaceListableItem(itemId)) {
      return { ok: false, reason: 'Este item não pode ser anunciado no Marketplace.' };
    }

    const qty = Math.max(1, Math.floor(quantity));
    const unitPrice = Math.max(1, Math.floor(unitPriceVolts));
    const owned = this.countInventoryItem(itemId);
    if (owned < qty) {
      return { ok: false, reason: 'Quantidade insuficiente no inventário.' };
    }

    const item = getItemById(itemId);
    this.removeInventoryItem(itemId, qty);
    this.bumpRevision('inventory');
    getPlayerMarketStore().addListing(itemId, qty, unitPrice, anonymous);
    alertSystem(`Oferta de venda publicada: ${qty}× ${item?.name ?? itemId} por ${unitPrice} V.`);
    return { ok: true };
  }

  private createMarketBuyOrder(
    itemId: string,
    quantity: number,
    unitPriceVolts: number,
    anonymous: boolean,
  ): IntentHandleResult {
    if (!isMarketplaceListableItem(itemId)) {
      return { ok: false, reason: 'Este item não pode ser alvo de ordem de compra.' };
    }

    const qty = Math.max(1, Math.floor(quantity));
    const unitPrice = Math.max(1, Math.floor(unitPriceVolts));
    const totalCost = qty * unitPrice;
    if (this.state.wallet.dollarVolt < totalCost) {
      return { ok: false, reason: 'VOLTS insuficientes para reservar a ordem de compra.' };
    }

    const item = getItemById(itemId);
    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt - totalCost,
      alterCoins: this.state.wallet.alterCoins,
    });
    getMarketplaceBuyOrderStore().addOrder(itemId, qty, unitPrice, anonymous);
    alertSystem(`Ordem de compra publicada: ${qty}× ${item?.name ?? itemId} até ${unitPrice} V/un.`);
    return { ok: true };
  }

  private collectMarketVolts(listingId: string): IntentHandleResult {
    const result = getPlayerMarketStore().collectSoldListing(listingId);
    if (!result.ok) return { ok: false, reason: result.reason };
    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt + result.volts,
      alterCoins: this.state.wallet.alterCoins,
    });
    alertSystem(`Venda coletada: +${formatVolts(result.volts)}.`);
    return { ok: true };
  }

  private cancelMarketListing(listingId: string): IntentHandleResult {
    const listings = getPlayerMarketStore().getListings();
    const target = listings.find((entry) => entry.id === listingId && entry.status === 'LISTED');
    if (!target) {
      return { ok: false, reason: 'Anúncio não encontrado ou já encerrado.' };
    }

    const cancelResult = getPlayerMarketStore().cancelListing(listingId);
    if (!cancelResult.ok) return { ok: false, reason: cancelResult.reason };

    this.addInventoryItem(cancelResult.itemId, cancelResult.quantity);
    alertSystem(`Oferta de venda cancelada: ${cancelResult.quantity}× ${cancelResult.itemName} devolvido(s).`);
    return { ok: true };
  }

  private cancelMarketBuyOrder(orderId: string): IntentHandleResult {
    const cancelResult = getMarketplaceBuyOrderStore().cancelOrder(orderId);
    if (!cancelResult.ok) return { ok: false, reason: cancelResult.reason };

    this.commitWallet({
      dollarVolt: this.state.wallet.dollarVolt + cancelResult.refundVolts,
      alterCoins: this.state.wallet.alterCoins,
    });
    alertSystem(`Ordem de compra cancelada: ${formatVolts(cancelResult.refundVolts)} devolvidos.`);
    return { ok: true };
  }

  private countInventoryItem(itemId: string): number {
    return this.state.inventoryStacks
      .filter((stack) => stack.itemId === itemId)
      .reduce((sum, stack) => sum + stack.quantity, 0);
  }

  private removeInventoryItem(itemId: string, quantity: number): void {
    assertInventoryRemovalPolicyAllowed(itemId);

    let remaining = Math.max(1, Math.floor(quantity));
    const next: InventoryStack[] = [];

    for (const stack of this.state.inventoryStacks) {
      if (stack.itemId !== itemId) {
        next.push(stack);
        continue;
      }
      if (remaining >= stack.quantity) {
        remaining -= stack.quantity;
        continue;
      }
      next.push({ ...stack, quantity: stack.quantity - remaining });
      remaining = 0;
    }

    this.state.inventoryStacks = next;
  }

  /** Espelha inventário do cliente após equipar/desequipar (HUD única por item). */
  syncInventoryStacksFromClient(stacks: InventoryStack[], notify = true): void {
    this.state.inventoryStacks = stacks.map((row) => ({ ...row }));
    this.bumpRevision('inventory');
    if (notify) {
      this.notifyAll();
    }
  }

  /** Espelha carteira centralizada após operações locais (ex.: ShopService / skin). */
  syncWalletFromStore(): void {
    const snap = getPlayerWalletStore().getSnapshot();
    this.state.wallet = { dollarVolt: snap.dollarVolt, alterCoins: snap.alterCoins };
    this.mirrorWalletCurrencyIntoBag();
    this.bumpRevision('wallet');
    this.notifyWalletListeners();
  }

  /** Espelha carteira autoritativa (ex.: penalidade de fuga L1) no save local. */
  syncWalletFromAuthoritative(dollarVolt: number, alterCoins: number): void {
    this.state.wallet = {
      dollarVolt: Math.max(0, Math.floor(dollarVolt)),
      alterCoins: Math.max(0, Math.floor(alterCoins)),
    };
    this.mirrorWalletCurrencyIntoBag();
    this.bumpRevision('wallet');
    this.syncLegacyStores();
    this.persistLocalSave();
  }

  private mirrorWalletCurrencyIntoBag(): void {
    this.state.inventoryStacks = mirrorWalletCurrencyStacks(this.state.inventoryStacks, this.state.wallet);
    this.bumpRevision('inventory');
  }

  private commitWallet(wallet: MockWallet): void {
    this.state.wallet = { ...wallet };
    getPlayerWalletStore().applyBalances(wallet);
    this.mirrorWalletCurrencyIntoBag();
    this.bumpRevision('wallet');
    this.notifyWalletListeners();
  }

  private notifyWalletListeners(): void {
    const wallet = this.getWallet();
    for (const listener of this.walletListeners) listener(wallet);
  }

  private buildMarcoContext(): MarcoTreePlayerContext {
    const fromEquip = getPlayerEquipmentStore().getSnapshot().level;
    const fromData = getMutableDataStore().getCharacterLevel().level;
    const level = Math.max(
      Number.isFinite(fromEquip) ? fromEquip : 0,
      Number.isFinite(fromData) ? fromData : 0,
      1,
    );
    return {
      ...this.state.marcos,
      activeMarcos: sanitizeActiveMarcosForTrail(
        this.state.marcos.activeMarcos,
        this.state.marcos.ramificacaoSelecionada,
        this.state.marcos.trilhaTravada,
      ),
      playerLevel: Math.floor(level),
    };
  }

  private bumpRevision(slice: DataStoreSlice): void {
    this.sliceRevisions[slice] += 1;
    this.globalRevision = Math.max(
      this.sliceRevisions.characterLevel,
      this.sliceRevisions.wallet,
      this.sliceRevisions.inventory,
      this.sliceRevisions.bankStorage,
      this.sliceRevisions.marcosState,
      this.sliceRevisions.movesProgression,
    );
  }

  private notifyAll(): void {
    const wallet = this.getWallet();
    const inventory = this.getInventory();
    const bankStorage = this.getBankStorage();
    const marcosState = this.getMarcosState();
    const movesProgression = this.getMovesProgression();

    for (const listener of this.walletListeners) listener(wallet);
    for (const listener of this.inventoryListeners) listener(inventory);
    for (const listener of this.bankStorageListeners) listener(bankStorage);
    for (const listener of this.marcosListeners) listener(marcosState);
    for (const listener of this.movesProgressionListeners) listener(movesProgression);
  }

  /** Carteira / marcos / skins — inventário+SET passam só por PlayerItemSession. */
  private syncLegacyStores(): void {
    getPlayerWalletStore().applyServerWallet({
      playerId: 'mock',
      dollarVolt: this.state.wallet.dollarVolt,
      alterCoins: this.state.wallet.alterCoins,
    });

    const progression = getPlayerProgressionStore();
    if (this.state.marcos.ramificacaoSelecionada) {
      progression.setRamificacaoSelecionada(this.state.marcos.ramificacaoSelecionada);
    } else {
      progression.clearMarcosTrailSelection();
    }
    progression.setTrilhaTravada(this.state.marcos.trilhaTravada);
    progression.loadFromProgressionData({
      milestoneTotalProgress: this.state.marcos.milestoneTotalProgress,
    });

    getPlayerMarcosStore().applyAuthoritativeSnapshot(
      this.state.marcos.activeMarcos,
      this.state.marcos.flowSpeedBase,
      this.state.marcos.nodeProgression,
    );

    getPlayerSkinStore().syncOwnedSkins(cloneOwnedSkins(this.state.ownedSkins));
  }
}
