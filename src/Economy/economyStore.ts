import {
  assertAddItemAllowed,
  assertInventoryRemovalPolicyAllowed,
  assertTransferItemAllowed,
  validateAddItem,
} from './InventoryService.js';
import type { ActiveBookBuff, EquippedSlots, InventoryStack } from '../shared/character/equipmentState.js';
import type { BankCurrencyBalances } from '../shared/bank/bankTypes.js';
import { addItemToInventoryStacks } from '../shared/character/inventoryStackOps.js';
import {
  canAddItemWeight,
  CAPACITY_OVERLOAD_MESSAGE,
  resolveMaxAddableItemQuantity,
} from '../shared/character/carryCapacity.js';
import { equippedToEquipmentUiGrid, equipmentUiGridToEquipped, type EquipmentUiGridState } from '../shared/character/equipmentUiSlots.js';
import { removeEquippedItemsFromUiGrid } from '../shared/character/syncInventoryWithEquipment.js';
import { stacksToInventorySlotsWithStacking } from '../shared/character/inventoryStackOps.js';
import { BookActiveEffectType } from '../shared/items/itemTypes.js';
import { getBookDefinition } from '../shared/items/runesBooksCatalog.js';
import {
  isChargedEquipmentItemId,
  isChargedInventoryStackItemId,
  resolveItemMaxCharges,
  normalizeChargedInventoryStacks,
} from '../shared/items/chargedEquipment.js';
import { applyChargedEquipmentBattleParticipation } from '../shared/economy/chargedEquipmentBattle.js';
import { resolvePetInheritanceBonusesFromStacks } from '../shared/pet/petInheritanceBonuses.js';
import {
  normalizePlayerLoadoutData,
  type PlayerLoadoutData,
} from '../shared/world/playerLoadout.js';
import {
  isRetiredItemId,
  stripRetiredInventoryStacks,
} from '../shared/items/retiredItems.js';
import {
  isWalletCurrencyItemId,
  mirrorWalletCurrencyStacks,
} from '../shared/economy/walletCurrencyInventoryMirror.js';
import {
  ALTER_COIN_ITEM_ID,
  DOLLAR_VOLT_ITEM_ID,
} from '../shared/economy/premiumCurrency.js';
import {
  consumeInventoryQuantity,
  lockInventoryQuantity,
  unlockInventoryQuantity,
} from '../shared/bank/inventoryLockOps.js';

type InventoryRow = InventoryStack;

const authoritativeLoadoutByKey = new Map<string, PlayerLoadoutData>();

function loadoutCacheKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

/** Espelha SET do worldProfile para InventoryUpdated (loot, sync). */
export function setAuthoritativePlayerLoadout(
  playerId: string,
  characterId: number,
  loadout: PlayerLoadoutData,
): void {
  authoritativeLoadoutByKey.set(
    loadoutCacheKey(playerId, characterId),
    normalizePlayerLoadoutData(loadout),
  );
}

export function getAuthoritativePlayerLoadout(
  playerId: string,
  characterId: number,
): PlayerLoadoutData | null {
  return authoritativeLoadoutByKey.get(loadoutCacheKey(playerId, characterId)) ?? null;
}

export function clearAuthoritativePlayerLoadout(playerId: string, characterId: number): void {
  authoritativeLoadoutByKey.delete(loadoutCacheKey(playerId, characterId));
}

/** Atualiza cache autoritativo a partir do profile economy (loot / InventoryUpdated). */
export function syncAuthoritativeLoadoutFromEconomyProfile(
  playerId: string,
  characterId: number,
): PlayerLoadoutData {
  const profile = getCharacterProfile(playerId, characterId);
  const loadout = normalizePlayerLoadoutData({
    equipmentUiGrid: resolveProfileUiGrid(profile),
    equipped: profile.equipped,
  });
  setAuthoritativePlayerLoadout(playerId, characterId, loadout);
  return loadout;
}

/** Hidrata economy profile + cache a partir de loadout persistido no world. */
export function applyAuthoritativeLoadoutToEconomyProfile(
  playerId: string,
  characterId: number,
  loadout: PlayerLoadoutData,
): PlayerLoadoutData {
  const normalized = normalizePlayerLoadoutData(loadout);
  setAuthoritativePlayerLoadout(playerId, characterId, normalized);
  const key = profileKey(playerId, characterId);
  const profile = getOrCreateProfile(playerId, characterId);
  syncEquippedFromUiGrid(profile, normalized.equipmentUiGrid);
  syncInventoryFromProfile(key, profile);
  return normalized;
}

export type CharacterEconomyProfile = {
  inventory: InventoryRow[];
  equipped: EquippedSlots;
  equipmentUiGrid?: EquipmentUiGridState;
  activeBookBuff: ActiveBookBuff;
};

type PlayerWallet = {
  dollarVolt: number;
  alterCoins: number;
  lockedDollarVolt: number;
  lockedAlterCoins: number;
};

type BankVaultState = {
  itemStacks: InventoryStack[];
  currencies: BankCurrencyBalances;
};

type EconomyStoreState = {
  wallets: Map<string, PlayerWallet>;
  inventories: Map<string, InventoryRow[]>;
  profiles: Map<string, CharacterEconomyProfile>;
  banks: Map<string, BankVaultState>;
};

const state: EconomyStoreState = {
  wallets: new Map(),
  inventories: new Map(),
  profiles: new Map(),
  banks: new Map(),
};

function emptyBankVault(): BankVaultState {
  return { itemStacks: [], currencies: { dollarVolt: 0, alterCoins: 0 } };
}

function getOrCreateBankVault(playerId: string, characterId: number): BankVaultState {
  const key = profileKey(playerId, characterId);
  const existing = state.banks.get(key);
  if (existing) return existing;
  const vault = emptyBankVault();
  state.banks.set(key, vault);
  return vault;
}

function getOrCreateWallet(playerId: string, characterId: number): PlayerWallet {
  const key = profileKey(playerId, characterId);
  const existing = state.wallets.get(key);
  if (existing) return existing;
  const wallet: PlayerWallet = {
    dollarVolt: 0,
    alterCoins: 0,
    lockedDollarVolt: 0,
    lockedAlterCoins: 0,
  };
  state.wallets.set(key, wallet);
  return wallet;
}

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function inventoryKey(playerId: string, characterId: number): string {
  return profileKey(playerId, characterId);
}

function resolveProfileUiGrid(profile: CharacterEconomyProfile): EquipmentUiGridState {
  if (profile.equipmentUiGrid) {
    return { ...profile.equipmentUiGrid };
  }
  return equippedToEquipmentUiGrid(profile.equipped);
}

function syncEquippedFromUiGrid(profile: CharacterEconomyProfile, grid: EquipmentUiGridState): void {
  profile.equipmentUiGrid = { ...grid };
  profile.equipped = equipmentUiGridToEquipped(grid);
}

/** Mochila autoritativa — itens vestidos no SET não permanecem também como stack na bag. */
function dedupeProfileInventoryFromEquipment(profile: CharacterEconomyProfile): void {
  const grid = resolveProfileUiGrid(profile);
  profile.inventory = removeEquippedItemsFromUiGrid(profile.inventory, grid);
}

function defaultProfile(): CharacterEconomyProfile {
  return {
    inventory: [],
    equipped: {},
    activeBookBuff: null,
  };
}

function syncInventoryFromProfile(key: string, profile: CharacterEconomyProfile): void {
  state.inventories.set(key, profile.inventory.map((row) => ({ ...row })));
}

/** Carteira → stacks `dollar_volt` / `alter_coin` no bag (projeção; wallet continua SSOT). */
function applyWalletCurrencyMirrorToProfile(
  playerId: string,
  characterId: number,
  profile: CharacterEconomyProfile,
): void {
  const wallet = getOrCreateWallet(playerId, characterId);
  profile.inventory = mirrorWalletCurrencyStacks(profile.inventory, {
    dollarVolt: wallet.dollarVolt,
    alterCoins: wallet.alterCoins,
  });
  syncInventoryFromProfile(profileKey(playerId, characterId), profile);
}

function getOrCreateProfile(playerId: string, characterId: number): CharacterEconomyProfile {
  const key = profileKey(playerId, characterId);
  const existing = state.profiles.get(key);
  if (existing) return existing;

  const profile = defaultProfile();
  state.profiles.set(key, profile);
  syncInventoryFromProfile(key, profile);
  return profile;
}

export type EconomyTransactionResult =
  | {
      ok: true;
      playerId: string;
      characterId: number;
      walletBalance: number;
      alterCoins: number;
      inventorySnapshot: InventoryRow[];
    }
  | { ok: false; message: string };

export type EconomyPartyRef = {
  readonly playerId: string;
  readonly characterId: number;
};

export type TwoPartyEconomyPartyResult = {
  readonly playerId: string;
  readonly characterId: number;
  readonly walletBalance: number;
  readonly alterCoins: number;
  readonly inventorySnapshot: InventoryRow[];
};

export type TwoPartyEconomyTransactionResult =
  | { readonly ok: true; readonly parties: readonly [TwoPartyEconomyPartyResult, TwoPartyEconomyPartyResult] }
  | { readonly ok: false; readonly message: string };

export type EconomyStoreMutator = {
  addDollarVolt(amount: number): void;
  spendDollarVolt(amount: number): void;
  debitUpToDollarVolt(amount: number): number;
  addAlterCoins(amount: number): void;
  spendAlterCoins(amount: number): void;
  lockDollarVolt(amount: number): void;
  unlockDollarVolt(amount: number): void;
  spendLockedDollarVolt(amount: number): void;
  addInventoryItem(itemId: string, qty: number): void;
  /** Coleta parcial de loot — não lança erro; retorna overflow perdido. */
  addInventoryItemPartial(itemId: string, qty: number): { readonly added: number; readonly overflow: number };
  removeInventoryItem(itemId: string, qty: number): void;
  lockInventoryItem(itemId: string, qty: number): void;
  unlockInventoryItem(itemId: string, qty: number): void;
  consumeInventoryItem(itemId: string, qty: number): void;
  setInventory(stacks: readonly InventoryStack[]): void;
  setActiveBookBuff(buff: ActiveBookBuff): void;
  setEquippedSlots(slots: EquippedSlots): void;
  setEquipmentUiGrid(grid: EquipmentUiGridState): void;
  consumeChargedEquipmentBattleParticipation(): import('../shared/economy/chargedEquipmentBattle.js').ChargedEquipmentBattleConsumptionResult;
  getInventory(): InventoryRow[];
  getEquipped(): EquippedSlots;
  getEquipmentUiGrid(): EquipmentUiGridState;
  getActiveBookBuff(): ActiveBookBuff;
};

type PartyDeepSnapshot = {
  readonly key: string;
  readonly wallet: PlayerWallet;
  readonly profile: CharacterEconomyProfile;
  readonly inventory: InventoryRow[];
  readonly bank: BankVaultState;
};

function cloneWallet(wallet: PlayerWallet): PlayerWallet {
  return { ...wallet };
}

function cloneProfile(profile: CharacterEconomyProfile): CharacterEconomyProfile {
  return {
    inventory: profile.inventory.map((row) => ({ ...row })),
    equipped: { ...profile.equipped },
    ...(profile.equipmentUiGrid ? { equipmentUiGrid: { ...profile.equipmentUiGrid } } : {}),
    activeBookBuff: profile.activeBookBuff ? { ...profile.activeBookBuff } : null,
  };
}

function cloneBank(bank: BankVaultState): BankVaultState {
  return {
    itemStacks: bank.itemStacks.map((row) => ({ ...row })),
    currencies: { ...bank.currencies },
  };
}

function capturePartySnapshot(playerId: string, characterId: number): PartyDeepSnapshot {
  const key = profileKey(playerId, characterId);
  const wallet = getOrCreateWallet(playerId, characterId);
  const profile = getOrCreateProfile(playerId, characterId);
  const bank = getOrCreateBankVault(playerId, characterId);
  return {
    key,
    wallet: cloneWallet(wallet),
    profile: cloneProfile(profile),
    inventory: (state.inventories.get(key) ?? []).map((row) => ({ ...row })),
    bank: cloneBank(bank),
  };
}

function restorePartySnapshot(snapshot: PartyDeepSnapshot): void {
  state.wallets.set(snapshot.key, cloneWallet(snapshot.wallet));
  state.profiles.set(snapshot.key, cloneProfile(snapshot.profile));
  state.inventories.set(snapshot.key, snapshot.inventory.map((row) => ({ ...row })));
  state.banks.set(snapshot.key, cloneBank(snapshot.bank));
}

let economyMutex: Promise<void> = Promise.resolve();

async function withEconomyMutex<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void = () => {};
  const previous = economyMutex;
  economyMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

function createEconomyMutator(playerId: string, characterId: number): EconomyStoreMutator {
  const key = profileKey(playerId, characterId);
  const profile = getOrCreateProfile(playerId, characterId);
  return {
    addDollarVolt(amount) {
      const wallet = getOrCreateWallet(playerId, characterId);
      wallet.dollarVolt += amount;
    },
    spendDollarVolt(amount) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Quantidade de VOLTS inválida.');
      }
      const wallet = getOrCreateWallet(playerId, characterId);
      if (wallet.dollarVolt < amount) {
        throw new Error('VOLTS insuficientes.');
      }
      wallet.dollarVolt -= amount;
    },
    debitUpToDollarVolt(amount) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Quantidade de VOLTS inválida.');
      }
      const wallet = getOrCreateWallet(playerId, characterId);
      const debited = Math.min(wallet.dollarVolt, amount);
      wallet.dollarVolt -= debited;
      return debited;
    },
    addAlterCoins(amount) {
      if (amount <= 0) return;
      const wallet = getOrCreateWallet(playerId, characterId);
      wallet.alterCoins += Math.floor(amount);
    },
    spendAlterCoins(amount) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Quantidade de Alter Coins inválida.');
      }
      const wallet = getOrCreateWallet(playerId, characterId);
      if (wallet.alterCoins < amount) {
        throw new Error('Alter Coins insuficientes.');
      }
      wallet.alterCoins -= amount;
    },
    lockDollarVolt(amount) {
      const qty = Math.floor(amount);
      if (qty <= 0) return;
      const result = lockWalletCurrency(playerId, characterId, 'volts', qty);
      if (!result.ok) throw new Error(result.message);
    },
    unlockDollarVolt(amount) {
      const qty = Math.floor(amount);
      if (qty <= 0) return;
      unlockWalletCurrency(playerId, characterId, 'volts', qty);
    },
    spendLockedDollarVolt(amount) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Quantidade de VOLTS inválida.');
      }
      const wallet = getOrCreateWallet(playerId, characterId);
      if (wallet.lockedDollarVolt < amount || wallet.dollarVolt < amount) {
        throw new Error('VOLTS insuficientes.');
      }
      wallet.dollarVolt -= amount;
      wallet.lockedDollarVolt -= amount;
    },
    addInventoryItem(itemId, qty) {
      if (qty <= 0) return;
      if (isRetiredItemId(itemId)) return;

      if (itemId === DOLLAR_VOLT_ITEM_ID) {
        const wallet = getOrCreateWallet(playerId, characterId);
        wallet.dollarVolt += Math.floor(qty);
        return;
      }
      if (itemId === ALTER_COIN_ITEM_ID) {
        const wallet = getOrCreateWallet(playerId, characterId);
        wallet.alterCoins += Math.floor(qty);
        return;
      }

      assertAddItemAllowed(itemId, profile.inventory, qty);

      const equipment = equippedToEquipmentUiGrid(profile.equipped);
      const inventorySlots = stacksToInventorySlotsWithStacking(profile.inventory);
      const canAdd = canAddItemWeight(
        { inventorySlots, equipment, playerLevel: 1 },
        itemId,
        qty,
      );
      if (!canAdd) {
        throw new Error(CAPACITY_OVERLOAD_MESSAGE);
      }

      const result = addItemToInventoryStacks(profile.inventory, itemId, qty);
      if (result.overflow > 0) {
        throw new Error(`Inventário cheio: ${itemId}`);
      }
      profile.inventory = result.stacks.map((row) => (
        row.itemId === itemId && isChargedInventoryStackItemId(itemId) && row.charges === undefined
          ? { ...row, charges: resolveItemMaxCharges(itemId) }
          : row
      ));
      syncInventoryFromProfile(key, profile);
    },
    addInventoryItemPartial(itemId, qty) {
      if (qty <= 0) return { added: 0, overflow: 0 };
      if (isRetiredItemId(itemId)) return { added: 0, overflow: qty };

      if (itemId === DOLLAR_VOLT_ITEM_ID) {
        const wallet = getOrCreateWallet(playerId, characterId);
        const added = Math.floor(qty);
        wallet.dollarVolt += added;
        return { added, overflow: 0 };
      }
      if (itemId === ALTER_COIN_ITEM_ID) {
        const wallet = getOrCreateWallet(playerId, characterId);
        const added = Math.floor(qty);
        wallet.alterCoins += added;
        return { added, overflow: 0 };
      }

      const addCheck = validateAddItem(itemId, profile.inventory, qty);
      if (!addCheck.ok) {
        return { added: 0, overflow: qty };
      }

      const equipment = equippedToEquipmentUiGrid(profile.equipped);
      const inventorySlots = stacksToInventorySlotsWithStacking(profile.inventory);
      const carryInput = { inventorySlots, equipment, playerLevel: 1 };
      const weightCap = resolveMaxAddableItemQuantity(carryInput, itemId, qty);
      if (weightCap <= 0) {
        return { added: 0, overflow: qty };
      }

      const result = addItemToInventoryStacks(profile.inventory, itemId, weightCap);
      profile.inventory = result.stacks.map((row) => (
        row.itemId === itemId && isChargedInventoryStackItemId(itemId) && row.charges === undefined
          ? { ...row, charges: resolveItemMaxCharges(itemId) }
          : row
      ));
      syncInventoryFromProfile(key, profile);

      const added = result.added;
      return { added, overflow: qty - added };
    },
    removeInventoryItem(itemId, qty) {
      if (isWalletCurrencyItemId(itemId)) {
        throw new Error('Moedas não podem ser removidas do inventário — use a carteira.');
      }
      assertInventoryRemovalPolicyAllowed(itemId);

      const rows = profile.inventory;
      const existing = rows.find((row) => row.itemId === itemId);
      if (!existing || existing.quantity < qty) {
        throw new Error(`Estoque insuficiente: ${itemId}`);
      }
      existing.quantity -= qty;
      if (existing.quantity <= 0) {
        profile.inventory = rows.filter((row) => row.itemId !== itemId);
      }
      syncInventoryFromProfile(key, profile);
    },
    lockInventoryItem(itemId, qty) {
      if (isWalletCurrencyItemId(itemId)) {
        throw new Error('Moedas não podem ser reservadas no inventário — use a carteira.');
      }
      assertTransferItemAllowed(itemId);
      const locked = lockInventoryQuantity(profile.inventory, itemId, qty);
      if (!locked.ok) throw new Error(locked.reason);
      profile.inventory = locked.stacks;
      syncInventoryFromProfile(key, profile);
    },
    unlockInventoryItem(itemId, qty) {
      profile.inventory = unlockInventoryQuantity(profile.inventory, itemId, qty);
      syncInventoryFromProfile(key, profile);
    },
    consumeInventoryItem(itemId, qty) {
      if (isWalletCurrencyItemId(itemId)) {
        throw new Error('Moedas não podem ser removidas do inventário — use a carteira.');
      }
      assertInventoryRemovalPolicyAllowed(itemId);
      const consumed = consumeInventoryQuantity(profile.inventory, itemId, qty);
      if (!consumed.ok) throw new Error(consumed.reason);
      profile.inventory = consumed.stacks;
      syncInventoryFromProfile(key, profile);
    },
    setInventory(stacks) {
      profile.inventory = stripRetiredInventoryStacks(stacks).map((row) => ({ ...row }));
      dedupeProfileInventoryFromEquipment(profile);
      applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);
    },
    setActiveBookBuff(buff) {
      profile.activeBookBuff = buff;
    },
    setEquippedSlots(slots) {
      profile.equipped = { ...slots };
      profile.equipmentUiGrid = equippedToEquipmentUiGrid(profile.equipped);
      dedupeProfileInventoryFromEquipment(profile);
      syncInventoryFromProfile(key, profile);
    },
    setEquipmentUiGrid(grid) {
      syncEquippedFromUiGrid(profile, grid);
      dedupeProfileInventoryFromEquipment(profile);
      syncInventoryFromProfile(key, profile);
    },
    consumeChargedEquipmentBattleParticipation() {
      const result = applyChargedEquipmentBattleParticipation(profile);
      syncInventoryFromProfile(key, profile);
      return result;
    },
    getInventory() {
      return profile.inventory.map((row) => ({ ...row }));
    },
    getEquipped() {
      return { ...profile.equipped };
    },
    getEquipmentUiGrid() {
      return resolveProfileUiGrid(profile);
    },
    getActiveBookBuff() {
      return profile.activeBookBuff;
    },
  };
}

function partyResult(playerId: string, characterId: number): TwoPartyEconomyPartyResult {
  const key = profileKey(playerId, characterId);
  const wallet = getOrCreateWallet(playerId, characterId);
  return {
    playerId,
    characterId,
    walletBalance: wallet.dollarVolt,
    alterCoins: wallet.alterCoins,
    inventorySnapshot: state.inventories.get(key) ?? [],
  };
}

export async function executeEconomyTransaction(
  playerId: string,
  characterId: number,
  mutate: (store: EconomyStoreMutator) => void | Promise<void>,
): Promise<EconomyTransactionResult> {
  return withEconomyMutex(async () => {
    const snapshot = capturePartySnapshot(playerId, characterId);
    const profile = getOrCreateProfile(playerId, characterId);
    const key = profileKey(playerId, characterId);
    try {
      await mutate(createEconomyMutator(playerId, characterId));
      applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);
      const wallet = getOrCreateWallet(playerId, characterId);
      return {
        ok: true,
        playerId,
        characterId,
        walletBalance: wallet.dollarVolt,
        alterCoins: wallet.alterCoins,
        inventorySnapshot: state.inventories.get(key) ?? [],
      };
    } catch (error) {
      restorePartySnapshot(snapshot);
      const message = error instanceof Error ? error.message : 'Falha na transação econômica.';
      return { ok: false, message };
    }
  });
}

/**
 * Transação atômica em dois personagens. Rollback profundo dos dois se qualquer lado falhar.
 * Serializada com as txs de um jogador (anti-dup por corrida).
 */
export async function executeTwoPartyEconomyTransaction(
  partyA: EconomyPartyRef,
  partyB: EconomyPartyRef,
  mutate: (
    storeA: EconomyStoreMutator,
    storeB: EconomyStoreMutator,
  ) => void | Promise<void>,
): Promise<TwoPartyEconomyTransactionResult> {
  const keyA = profileKey(partyA.playerId, partyA.characterId);
  const keyB = profileKey(partyB.playerId, partyB.characterId);
  if (keyA === keyB) {
    return { ok: false, message: 'Não é possível transacionar o mesmo personagem consigo mesmo.' };
  }

  return withEconomyMutex(async () => {
    const snapshotA = capturePartySnapshot(partyA.playerId, partyA.characterId);
    const snapshotB = capturePartySnapshot(partyB.playerId, partyB.characterId);
    try {
      await mutate(
        createEconomyMutator(partyA.playerId, partyA.characterId),
        createEconomyMutator(partyB.playerId, partyB.characterId),
      );
      applyWalletCurrencyMirrorToProfile(
        partyA.playerId,
        partyA.characterId,
        getOrCreateProfile(partyA.playerId, partyA.characterId),
      );
      applyWalletCurrencyMirrorToProfile(
        partyB.playerId,
        partyB.characterId,
        getOrCreateProfile(partyB.playerId, partyB.characterId),
      );
      return {
        ok: true,
        parties: [
          partyResult(partyA.playerId, partyA.characterId),
          partyResult(partyB.playerId, partyB.characterId),
        ],
      };
    } catch (error) {
      restorePartySnapshot(snapshotA);
      restorePartySnapshot(snapshotB);
      const message = error instanceof Error ? error.message : 'Falha na transação econômica.';
      return { ok: false, message };
    }
  });
}

export function getWalletBalance(playerId: string, characterId: number): number {
  return getOrCreateWallet(playerId, characterId).dollarVolt;
}

export function getAlterCoinsBalance(playerId: string, characterId: number): number {
  return getOrCreateWallet(playerId, characterId).alterCoins;
}

export function getPlayerWallet(playerId: string, characterId: number): Readonly<PlayerWallet> {
  const wallet = getOrCreateWallet(playerId, characterId);
  return {
    dollarVolt: wallet.dollarVolt,
    alterCoins: wallet.alterCoins,
    lockedDollarVolt: wallet.lockedDollarVolt,
    lockedAlterCoins: wallet.lockedAlterCoins,
  };
}

/** Garante carteira do personagem em memória (0/0 se nova) — não injeta VOLTS de teste. */
export function seedPlayerWalletIfEmpty(
  playerId: string,
  characterId: number,
  _seed?: { readonly dollarVolt?: number; readonly alterCoins?: number },
): void {
  getOrCreateWallet(playerId, characterId);
}

/** Snapshot autoritativo externo (Supabase / persistência). */
export function applyAuthoritativeWalletBalances(
  playerId: string,
  characterId: number,
  dollarVolt: number,
  alterCoins: number,
): void {
  const wallet = getOrCreateWallet(playerId, characterId);
  wallet.dollarVolt = Math.max(0, Math.floor(dollarVolt));
  wallet.alterCoins = Math.max(0, Math.floor(alterCoins));
  const profile = getOrCreateProfile(playerId, characterId);
  applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);
}

export function applyAuthoritativeEquippedSlots(
  playerId: string,
  characterId: number,
  equipped: EquippedSlots,
): void {
  const profile = getOrCreateProfile(playerId, characterId);
  profile.equipped = { ...equipped };
  profile.equipmentUiGrid = equippedToEquipmentUiGrid(profile.equipped);
  dedupeProfileInventoryFromEquipment(profile);
  syncInventoryFromProfile(profileKey(playerId, characterId), profile);
}

export function getCharacterProfile(playerId: string, characterId: number): CharacterEconomyProfile {
  const profile = getOrCreateProfile(playerId, characterId);
  return {
    inventory: normalizeChargedInventoryStacks(profile.inventory).map((row) => ({ ...row })),
    equipped: { ...profile.equipped },
    equipmentUiGrid: resolveProfileUiGrid(profile),
    activeBookBuff: profile.activeBookBuff,
  };
}

/** True só se o personagem já foi hidratado — não cria perfil vazio. */
export function hasCharacterEconomyLoaded(playerId: string, characterId: number): boolean {
  return state.profiles.has(profileKey(playerId, characterId));
}

/**
 * Garante que o perfil existe em memória.
 * Não apaga inventário já carregado (login / hydrate).
 */
export function ensureAuthoritativePlayerEconomyEmpty(
  playerId: string,
  characterId: number,
): void {
  getOrCreateWallet(playerId, characterId);
  const profile = getOrCreateProfile(playerId, characterId);
  if (!profile.equipmentUiGrid) {
    profile.equipmentUiGrid = equippedToEquipmentUiGrid(profile.equipped ?? {});
  }
  syncInventoryFromProfile(profileKey(playerId, characterId), profile);
}

/**
 * Força inventário/equip/banco/carteira zerados (create / recriação).
 * Carteira é por personagem — não afeta outros chars da conta.
 */
export function resetAuthoritativePlayerEconomyToEmpty(
  playerId: string,
  characterId: number,
): void {
  const key = profileKey(playerId, characterId);
  const wallet = getOrCreateWallet(playerId, characterId);
  wallet.dollarVolt = 0;
  wallet.alterCoins = 0;
  wallet.lockedDollarVolt = 0;
  wallet.lockedAlterCoins = 0;

  const profile = defaultProfile();
  profile.equipmentUiGrid = equippedToEquipmentUiGrid({});
  state.profiles.set(key, profile);
  syncInventoryFromProfile(key, profile);
  state.banks.set(key, emptyBankVault());
  clearAuthoritativePlayerLoadout(playerId, characterId);
}

/** Remove economia do personagem da RAM (delete / recriação). */
export function purgeAuthoritativeCharacterEconomy(
  playerId: string,
  characterId: number,
): void {
  const key = profileKey(playerId, characterId);
  state.profiles.delete(key);
  state.inventories.delete(key);
  state.banks.delete(key);
  state.wallets.delete(key);
  clearAuthoritativePlayerLoadout(playerId, characterId);
}

export function getCharacterInventoryStacks(
  playerId: string,
  characterId: number,
): InventoryStack[] {
  const profile = getOrCreateProfile(playerId, characterId);
  return profile.inventory.map((row) => ({ ...row }));
}

export function setCharacterInventoryStacks(
  playerId: string,
  characterId: number,
  stacks: readonly InventoryStack[],
): void {
  const profile = getOrCreateProfile(playerId, characterId);
  profile.inventory = stacks.map((row) => ({ ...row }));
  applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);
}

export function getBankVaultState(
  playerId: string,
  characterId: number,
): BankVaultState {
  const vault = getOrCreateBankVault(playerId, characterId);
  return {
    itemStacks: vault.itemStacks.map((row) => ({ ...row })),
    currencies: { ...vault.currencies },
  };
}

export function lockWalletCurrency(
  playerId: string,
  characterId: number,
  currency: 'volts' | 'coins',
  amount: number,
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const qty = Math.floor(amount);
  if (qty <= 0) return { ok: false, message: 'Valor inválido.' };

  const wallet = getOrCreateWallet(playerId, characterId);
  const available = currency === 'volts'
    ? wallet.dollarVolt - wallet.lockedDollarVolt
    : wallet.alterCoins - wallet.lockedAlterCoins;
  if (available < qty) {
    return { ok: false, message: currency === 'volts' ? 'Volts insuficientes na carteira.' : 'Alter Coins insuficientes na carteira.' };
  }

  if (currency === 'volts') {
    wallet.lockedDollarVolt += qty;
  } else {
    wallet.lockedAlterCoins += qty;
  }
  return { ok: true };
}

export function unlockWalletCurrency(
  playerId: string,
  characterId: number,
  currency: 'volts' | 'coins',
  amount: number,
): void {
  const qty = Math.floor(amount);
  if (qty <= 0) return;
  const wallet = getOrCreateWallet(playerId, characterId);
  if (currency === 'volts') {
    wallet.lockedDollarVolt = Math.max(0, wallet.lockedDollarVolt - qty);
  } else {
    wallet.lockedAlterCoins = Math.max(0, wallet.lockedAlterCoins - qty);
  }
}

export function getEffectiveWalletSnapshot(playerId: string, characterId: number): {
  readonly dollarVolt: number;
  readonly alterCoins: number;
} {
  const wallet = getOrCreateWallet(playerId, characterId);
  return {
    dollarVolt: wallet.dollarVolt - wallet.lockedDollarVolt,
    alterCoins: wallet.alterCoins - wallet.lockedAlterCoins,
  };
}

export type BankEconomyTransactionResult =
  | {
      ok: true;
      playerId: string;
      characterId: number;
      walletBalance: number;
      alterCoins: number;
      inventorySnapshot: InventoryRow[];
      bankItemStacks: InventoryStack[];
      bankCurrencies: BankCurrencyBalances;
    }
  | { ok: false; message: string };

export type BankSetInventoryOptions = {
  /**
   * Saque do cofre: não remover cópias recém-sacadas só porque o mesmo itemId
   * já está no SET — senão o item some do banco e não entra na bag.
   */
  readonly skipEquipmentDedupe?: boolean;
};

export type BankEconomyMutator = {
  setInventory(stacks: readonly InventoryStack[], options?: BankSetInventoryOptions): void;
  setBank(stacks: readonly InventoryStack[], currencies: BankCurrencyBalances): void;
  applyWalletAndBank(
    wallet: { dollarVolt: number; alterCoins: number },
    bankCurrencies: BankCurrencyBalances,
  ): void;
  getInventory(): InventoryStack[];
  getBank(): BankVaultState;
};

/** Transação atômica inventário + cofre + carteira (banco). */
export async function executeBankEconomyTransaction(
  playerId: string,
  characterId: number,
  mutate: (store: BankEconomyMutator) => void | Promise<void>,
): Promise<BankEconomyTransactionResult> {
  return withEconomyMutex(async () => {
    const snapshot = capturePartySnapshot(playerId, characterId);
    const key = profileKey(playerId, characterId);
    const profile = getOrCreateProfile(playerId, characterId);
    const bank = getOrCreateBankVault(playerId, characterId);
    const wallet = getOrCreateWallet(playerId, characterId);

    try {
      await mutate({
      setInventory(stacks, options) {
        profile.inventory = stacks.map((row) => ({ ...row }));
        if (!options?.skipEquipmentDedupe) {
          dedupeProfileInventoryFromEquipment(profile);
        }
        applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);
      },
      setBank(stacks, currencies) {
        bank.itemStacks = stacks.map((row) => ({ ...row }));
        bank.currencies = { ...currencies };
      },
      applyWalletAndBank(nextWallet, bankCurrencies) {
        wallet.dollarVolt = nextWallet.dollarVolt;
        wallet.alterCoins = nextWallet.alterCoins;
        wallet.lockedDollarVolt = 0;
        wallet.lockedAlterCoins = 0;
        bank.currencies = { ...bankCurrencies };
      },
      getInventory() {
        return profile.inventory.map((row) => ({ ...row }));
      },
      getBank() {
        return {
          itemStacks: bank.itemStacks.map((row) => ({ ...row })),
          currencies: { ...bank.currencies },
        };
      },
    });

      applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);

      return {
        ok: true,
        playerId,
        characterId,
        walletBalance: wallet.dollarVolt,
        alterCoins: wallet.alterCoins,
        inventorySnapshot: state.inventories.get(key) ?? [],
        bankItemStacks: bank.itemStacks.map((row) => ({ ...row })),
        bankCurrencies: { ...bank.currencies },
      };
    } catch (error) {
      restorePartySnapshot(snapshot);
      const message = error instanceof Error ? error.message : 'Falha na transação bancária.';
      return { ok: false, message };
    }
  });
}

export function getActiveLootBonusMultiplier(playerId: string, characterId: number): number {
  const profile = getOrCreateProfile(playerId, characterId);
  let multiplier = 1;

  const buff = profile.activeBookBuff;
  if (buff && buff.expiresAt > Date.now()) {
    const book = getBookDefinition(buff.bookId);
    if (book?.activeEffect.type === BookActiveEffectType.LootBonus) {
      multiplier *= 1 + book.activeEffect.value;
    }
  }

  const inheritance = resolvePetInheritanceBonusesFromStacks(profile.inventory);
  if (inheritance.dropBonusPercent > 0) {
    multiplier *= 1 + inheritance.dropBonusPercent / 100;
  }

  return multiplier;
}

export function getPetInheritanceBonusesForCharacter(
  playerId: string,
  characterId: number,
): import('../shared/pet/petInheritanceBonuses.js').PetInheritanceBonuses {
  const profile = getCharacterProfile(playerId, characterId);
  return resolvePetInheritanceBonusesFromStacks(profile.inventory);
}

export type CharacterEconomyPersistenceSlice = {
  readonly wallet: {
    readonly dollarVolt: number;
    readonly alterCoins: number;
    readonly lockedDollarVolt: number;
    readonly lockedAlterCoins: number;
  };
  readonly profile: CharacterEconomyProfile;
  readonly bank: BankVaultState;
};

/** Exporta estado econômico para persistência MVP. */
export function exportCharacterEconomyPersistence(
  playerId: string,
  characterId: number,
): CharacterEconomyPersistenceSlice {
  const wallet = getOrCreateWallet(playerId, characterId);
  const profile = getCharacterProfile(playerId, characterId);
  const bank = getBankVaultState(playerId, characterId);
  return {
    wallet: {
      dollarVolt: wallet.dollarVolt,
      alterCoins: wallet.alterCoins,
      lockedDollarVolt: wallet.lockedDollarVolt,
      lockedAlterCoins: wallet.lockedAlterCoins,
    },
    profile,
    bank,
  };
}

/** Hidrata economyStore a partir de snapshot persistido. */
export function hydrateCharacterEconomyPersistence(
  playerId: string,
  characterId: number,
  slice: CharacterEconomyPersistenceSlice,
): void {
  const wallet = getOrCreateWallet(playerId, characterId);
  wallet.dollarVolt = slice.wallet.dollarVolt;
  wallet.alterCoins = slice.wallet.alterCoins;
  wallet.lockedDollarVolt = slice.wallet.lockedDollarVolt;
  wallet.lockedAlterCoins = slice.wallet.lockedAlterCoins;

  const profile = getOrCreateProfile(playerId, characterId);
  profile.inventory = normalizeChargedInventoryStacks(slice.profile.inventory).map((row) => ({ ...row }));
  profile.equipped = { ...slice.profile.equipped };
  profile.equipmentUiGrid = slice.profile.equipmentUiGrid
    ? { ...slice.profile.equipmentUiGrid }
    : equippedToEquipmentUiGrid(profile.equipped);
  profile.activeBookBuff = slice.profile.activeBookBuff;
  applyWalletCurrencyMirrorToProfile(playerId, characterId, profile);

  const bank = getOrCreateBankVault(playerId, characterId);
  bank.itemStacks = slice.bank.itemStacks.map((row) => ({ ...row }));
  bank.currencies = { ...slice.bank.currencies };
}

/** Testes — limpa estado in-memory da economia. */
export function resetEconomyStore(): void {
  state.wallets.clear();
  state.inventories.clear();
  state.profiles.clear();
  state.banks.clear();
  authoritativeLoadoutByKey.clear();
}
