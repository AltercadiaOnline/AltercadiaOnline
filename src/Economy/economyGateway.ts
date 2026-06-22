import type { BattleLootPreview } from '../shared/loot/lootTypes.js';
import { battleLootPreviewFromBundle, hasLootContent } from '../shared/loot/lootTypes.js';
import type { LootRevealSlot } from '../shared/loot/lootRevealSlots.js';
import { getLootManager } from './LootManager.js';
import { generateEmptyBattleLoot } from './LootGenerator.js';
import {
  consumePendingLoot,
  discardPendingLoot,
  peekPendingLoot,
  stagePendingLoot,
} from './pendingLootStore.js';
import { getConsumableDefinition } from '../shared/items/consumablesCatalog.js';
import { getBookDefinition } from '../shared/items/runesBooksCatalog.js';
import { ConsumableUsage } from '../shared/items/itemTypes.js';
import {
  EconomyEventType,
  type AlterExchangeCompletedPayload,
  type LootGrantedPayload,
  type UpdateBankSuccessPayload,
} from '../shared/economy/events.js';
import { BANK_TRANSACTION_SUCCESS_MESSAGE } from '../shared/bank/bankConstants.js';
import type { BankCurrencyTypeId } from '../shared/bank/bankConstants.js';
import { validateBankCurrencyRequest } from '../shared/bank/bankCurrencyRules.js';
import { validateInventoryDeleteIntent } from '../shared/economy/inventoryPolicy.js';
import { resolveAvailableStackQuantity } from '../shared/bank/inventoryLockOps.js';
import { getBankTransactionManager } from './BankTransactionManager.js';
import { consumeBankIntent } from './bankIntentLedger.js';
import type { BankEconomyTransactionResult } from './economyStore.js';
import {
  ALTER_TO_VOLTS_EXCHANGE_RATE,
  calculateVoltsFromAlterCoins,
  isValidAlterExchangeAmount,
} from '../shared/economy/premiumCurrency.js';
import { BATTLE_SURRENDER_VOLT_PENALTY } from '../shared/combat/battleSurrenderConstants.js';
import { mergeAuthorizedEquippedSnapshot } from '../shared/economy/authorizeEquippedSnapshot.js';
import type { EquippedSlots, InventoryStack, PlayerWorldVitals } from '../shared/character/equipmentState.js';
import type { EquipmentUiSlotId } from '../shared/character/equipmentUiSlots.js';
import {
  equipmentUiGridToEquipped,
  equippedToEquipmentUiGrid,
} from '../shared/character/equipmentUiSlots.js';
import {
  applyEquipToUiGrid,
  applyUnequipFromUiGrid,
  applyEquipmentUiGridTransition,
} from '../shared/character/equipUiGridTransaction.js';
import {
  sanitizeEquipmentUiGrid,
  validateLoadoutTransition,
} from '../shared/character/loadoutValidation.js';
import {
  normalizePlayerLoadoutData,
  type PlayerLoadoutData,
} from '../shared/world/playerLoadout.js';
import { globalEventBus } from './EventBus.js';
import {
  executeEconomyTransaction,
  getActiveLootBonusMultiplier,
  getAuthoritativePlayerLoadout,
  getCharacterProfile,
  getPlayerWallet,
  syncAuthoritativeLoadoutFromEconomyProfile,
  getCharacterInventoryStacks,
  setCharacterInventoryStacks,
} from './economyStore.js';
import { validateCraftItemRequest } from '../shared/crafting/craftValidation.js';
import { findNpcVendorListing } from '../shared/economy/npcVendorCatalog.js';
import {
  validateInventoryItemSale,
  validateNpcPurchase,
} from '../shared/economy/npcVendorService.js';
import { assertSellItemAllowed, assertTransferItemAllowed } from './InventoryService.js';
import {
  canEquipItemWeight,
  CAPACITY_OVERLOAD_MESSAGE,
} from '../shared/character/carryCapacity.js';
import {
  INVENTORY_SLOT_COUNT,
  stacksToInventorySlots,
} from '../shared/character/inventorySlots.js';
import { resolveTargetUiSlotForEquip } from '../shared/character/equipItemMapping.js';
import { getAuthoritativeProgression } from '../server/progression/authoritativeProgressionStore.js';
import type { GiftTransferSuccess } from '../shared/gift/giftTransferProtocol.js';
import { validateCaelRationPurchase, validatePetFeedSpecialRation } from '../shared/economy/caelPetService.js';
import { applyPetDirectFeed } from '../shared/pet/petState.js';
import { formatPetAffinityGainPercent } from '../shared/pet/petAffinity.js';
import { clampPetSlotIndex } from '../shared/pet/petRoster.js';
import { getSkinShopItem } from '../shared/character/skinShopCatalog.js';
import type { SkinSlotId } from '../shared/character/playerSkin.js';
import { addOwnedSkinOption, ownsSkinOption } from './skinOwnershipStore.js';
import {
  buildAdoptedPet,
  validatePetPurchase,
} from '../shared/economy/petTrainerService.js';
import type { PetKindId } from '../shared/pet/petCatalog.js';
import type { PetColorId } from '../shared/pet/petColorPalette.js';
import type { PetGenderId } from '../shared/pet/petGender.js';
import { rosterHasPetKind } from '../shared/pet/petRoster.js';
import { formatVolts } from '../shared/economy/premiumCurrency.js';
import { addRationCharges, consumeRationCharge, getPetAffinityRecord, recordPetRationFeedAt } from './petAffinityStore.js';
import { adoptPetOnServer, getPetRosterSnapshot, updatePetAtSlot } from './petRosterStore.js';
import { computeInventoryChecksum } from '../shared/character/inventoryChecksum.js';
import { getInventoryLockRegistry, INVENTORY_LOCK_TIMEOUT_MS } from './inventoryLockRegistry.js';
import { unlockInventoryQuantity } from '../shared/bank/inventoryLockOps.js';
import {
  buildEconomyAuditEntry,
  emitEconomyAuditLog,
} from './economyAuditHook.js';
import { EconomyAuditAction } from '../shared/economy/economyAuditTypes.js';

function auditEconomyMutation(
  userId: string,
  action: typeof EconomyAuditAction[keyof typeof EconomyAuditAction],
  itemId: string,
  quantity: number,
  reason: string,
): void {
  emitEconomyAuditLog(buildEconomyAuditEntry({
    userId,
    action,
    itemId,
    quantity,
    reason,
  }));
}

function inventoryUpdatedPayload(
  playerId: string,
  characterId: number,
  items: readonly import('../shared/character/equipmentState.js').InventoryStack[],
  extras?: { readonly intentId?: string; readonly revision?: number },
) {
  const profile = getCharacterProfile(playerId, characterId);
  const loadout = getAuthoritativePlayerLoadout(playerId, characterId);
  const equipmentUiGrid = loadout?.equipmentUiGrid
    ?? profile.equipmentUiGrid
    ?? equippedToEquipmentUiGrid(profile.equipped);
  const equipped = loadout?.equipped ?? profile.equipped;

  const mappedItems = items.map((row) => ({ ...row }));

  return {
    playerId,
    characterId,
    items: mappedItems,
    equipped,
    equipmentUiGrid,
    inventoryChecksum: computeInventoryChecksum(mappedItems),
    ...extras,
  };
}

export function publishInventoryUpdated(
  playerId: string,
  characterId: number,
  items: readonly import('../shared/character/equipmentState.js').InventoryStack[],
  extras?: { readonly intentId?: string; readonly revision?: number },
): void {
  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(playerId, characterId, items, extras),
  });
}

let lastInventoryLockSweepMs = 0;

/** Libera locks expirados (ghost items) e emite INVENTORY_UPDATE autoritativo. */
export function sweepExpiredInventoryLocks(nowMs = Date.now()): void {
  if (nowMs - lastInventoryLockSweepMs < 5_000) return;
  lastInventoryLockSweepMs = nowMs;

  const registry = getInventoryLockRegistry();
  for (const expired of registry.listExpired(nowMs)) {
    const stacks = getCharacterInventoryStacks(expired.playerId, expired.characterId);
    const unlocked = unlockInventoryQuantity(stacks, expired.itemId, expired.quantity);
    setCharacterInventoryStacks(expired.playerId, expired.characterId, unlocked);
    registry.untrack(expired.playerId, expired.characterId, expired.itemId);

    console.warn('[Economy] Lock de inventário expirado — liberando ghost item', {
      playerId: expired.playerId,
      characterId: expired.characterId,
      itemId: expired.itemId,
      quantity: expired.quantity,
      timeoutMs: INVENTORY_LOCK_TIMEOUT_MS,
    });

    publishInventoryUpdated(expired.playerId, expired.characterId, unlocked, {
      revision: nowMs,
    });
  }
}

export type StageBattleLootRequest = {
  readonly sourceId: string;
  readonly winnerId: string;
  readonly characterId: number;
  readonly defeatedLevel?: number;
};

export type CollectBattleLootRequest = {
  readonly lootId: string;
  readonly winnerId: string;
  readonly characterId: number;
};

export type CollectBattleLootResult =
  | {
      readonly ok: true;
      readonly payload: LootGrantedPayload;
      /** Itens que não couberam (slots/CAP) — perdidos após coleta (decisão B). */
      readonly discardedQuantity?: number;
    }
  | { readonly ok: false; readonly message: string };

/** @deprecated Use StageBattleLootRequest flow — mantido para testes legados. */
export type GrantLootRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly creatureId: string;
};

/** @deprecated */
export type GrantLootResult =
  | { readonly ok: true; readonly loot: BattleLootPreview; readonly payload: LootGrantedPayload }
  | { readonly ok: false; readonly message: string };

export type ConsumeConsumableRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly itemId: string;
};

export type ConsumeConsumableResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export type ActivateBookRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly bookId: string;
};

export type ActivateBookResult =
  | { readonly ok: true; readonly expiresAt: number }
  | { readonly ok: false; readonly message: string };

export type StagedBattleLootResult = {
  readonly preview: BattleLootPreview;
  readonly lootReveal: readonly LootRevealSlot[];
};

/** Alias de produto — pacote com 4 slots + preview pendente de coleta. */
export type LootPackage = StagedBattleLootResult & {
  readonly lootId: string;
};

/** Calcula loot (4 slots + bundle) e mantém pendente até o jogador coletar na HUD. */
export function stageBattleLoot(request: StageBattleLootRequest): StagedBattleLootResult | null {
  const lootBonus = getActiveLootBonusMultiplier(request.winnerId, request.characterId);
  let generated = getLootManager().generateBattleLoot(request.sourceId, request.winnerId, {
    defeatedLevel: request.defeatedLevel ?? 1,
    lootBonusMultiplier: lootBonus,
  });

  if (!generated) {
    generated = generateEmptyBattleLoot(request.sourceId, request.winnerId);
  }

  stagePendingLoot(generated.bundle, request.characterId);
  return {
    preview: generated.preview,
    lootReveal: generated.lootReveal,
  };
}

/** Atalho — creatureId + level + bônus de drop. */
export function stageBattleLootForCreature(
  creatureId: string,
  winnerId: string,
  characterId: number,
  level: number,
  lootBonusMultiplier?: number,
): StagedBattleLootResult | null {
  if (lootBonusMultiplier !== undefined && lootBonusMultiplier > 1) {
    let generated = getLootManager().generateBattleLoot(creatureId, winnerId, {
      defeatedLevel: level,
      lootBonusMultiplier,
    });
    if (!generated) {
      generated = generateEmptyBattleLoot(creatureId, winnerId);
    }
    stagePendingLoot(generated.bundle, characterId);
    return {
      preview: generated.preview,
      lootReveal: generated.lootReveal,
    };
  }
  return stageBattleLoot({
    sourceId: creatureId,
    winnerId,
    characterId,
    defeatedLevel: level,
  });
}

/** Aplica loot previamente calculado — único ponto de mutação wallet/inventário. */
export async function collectBattleLoot(
  request: CollectBattleLootRequest,
): Promise<CollectBattleLootResult> {
  const pending = peekPendingLoot(request.lootId);
  if (!pending || pending.winnerId !== request.winnerId) {
    return { ok: false, message: 'Saque indisponível, expirado ou já coletado.' };
  }
  if (pending.characterId !== request.characterId) {
    return { ok: false, message: 'Personagem inválido para este saque.' };
  }

  const appliedItems: { itemId: string; quantity: number; rarity: string }[] = [];
  let discardedQuantity = 0;
  const droppedOverflow: { itemId: string; quantity: number }[] = [];

  const tx = await executeEconomyTransaction(
    request.winnerId,
    request.characterId,
    async (store) => {
      if (pending.voltReward > 0) {
        store.addDollarVolt(pending.voltReward);
      }
      for (const row of pending.items) {
        const { added, overflow } = store.addInventoryItemPartial(row.itemId, row.quantity);
        if (added > 0) {
          appliedItems.push({
            itemId: row.itemId,
            quantity: added,
            rarity: row.rarity,
          });
        }
        if (overflow > 0) {
          droppedOverflow.push({ itemId: row.itemId, quantity: overflow });
        }
        discardedQuantity += overflow;
      }
    },
  );

  if (!tx.ok) {
    globalEventBus.emit({
      type: EconomyEventType.TransactionFailed,
      payload: { message: tx.message },
    });
    return { ok: false, message: tx.message };
  }

  consumePendingLoot(request.lootId, request.winnerId);

  const itemIds: string[] = [];
  for (const row of appliedItems) {
    for (let i = 0; i < row.quantity; i += 1) {
      itemIds.push(row.itemId);
    }
  }

  const payload: LootGrantedPayload = {
    playerId: request.winnerId,
    characterId: request.characterId,
    creatureId: pending.sourceId,
    dollarVolt: pending.voltReward,
    itemIds,
    lootId: pending.lootId,
    items: appliedItems.map((item) => ({ ...item })),
  };

  globalEventBus.emit({ type: EconomyEventType.LootGranted, payload });
  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.winnerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
    },
  });
  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.winnerId,
      request.characterId,
      tx.inventorySnapshot,
    ),
  });

  for (const row of droppedOverflow) {
    auditEconomyMutation(
      request.winnerId,
      EconomyAuditAction.Drop,
      row.itemId,
      row.quantity,
      `loot_collect_overflow:${pending.sourceId}`,
    );
  }

  return {
    ok: true,
    payload,
    ...(discardedQuantity > 0 ? { discardedQuantity } : {}),
  };
}

export function dismissBattleLoot(lootId: string): void {
  discardPendingLoot(lootId);
}

/** Compat — rola, aplica imediatamente (evitar em produção; preferir stage + collect). */
export async function grantCreatureLoot(request: GrantLootRequest): Promise<GrantLootResult> {
  const staged = stageBattleLoot({
    sourceId: request.creatureId,
    winnerId: request.playerId,
    characterId: request.characterId,
  });
  if (!staged) {
    return { ok: false, message: `Criatura desconhecida: ${request.creatureId}` };
  }

  const collected = await collectBattleLoot({
    lootId: staged.preview.lootId,
    winnerId: request.playerId,
    characterId: request.characterId,
  });
  if (!collected.ok) {
    return { ok: false, message: collected.message };
  }

  return { ok: true, loot: staged.preview, payload: collected.payload };
}

/** Decrementa stack de consumível in_combat — transação ACID. */
export async function consumeConsumableInCombat(
  request: ConsumeConsumableRequest,
): Promise<ConsumeConsumableResult> {
  const def = getConsumableDefinition(request.itemId);
  if (!def || def.usage !== ConsumableUsage.InCombat) {
    return { ok: false, message: 'Consumível inválido para combate.' };
  }

  const profile = getCharacterProfile(request.playerId, request.characterId);
  const stack = profile.inventory.find((row) => row.itemId === request.itemId);
  if (!stack || stack.quantity < 1) {
    return { ok: false, message: 'Consumível indisponível no inventário.' };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.removeInventoryItem(request.itemId, 1);
    },
  );

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.playerId,
      request.characterId,
      tx.inventorySnapshot,
    ),
  });

  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Drop,
    request.itemId,
    1,
    'combat_consume',
  );

  return { ok: true };
}

/** Ativa buff temporal de livro (overworld loot). Requer item no inventário. */
export async function activateBook(request: ActivateBookRequest): Promise<ActivateBookResult> {
  const book = getBookDefinition(request.bookId);
  if (!book) {
    return { ok: false, message: 'Livro desconhecido.' };
  }

  const profile = getCharacterProfile(request.playerId, request.characterId);
  const stack = profile.inventory.find((row) => row.itemId === request.bookId);
  if (!stack || stack.quantity < 1) {
    return { ok: false, message: 'Livro não encontrado no inventário.' };
  }

  const expiresAt = Date.now() + book.activeEffect.durationMinutes * 60_000;
  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.setActiveBookBuff({ bookId: request.bookId, expiresAt });
    },
  );

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  return { ok: true, expiresAt };
}

export type SyncEquippedSnapshotResult =
  | { readonly ok: true; readonly equipped: EquippedSlots }
  | { readonly ok: false; readonly message: string };

/** Persiste equipamento validado do cliente antes do combate (fonte: economyStore). */
export async function syncCharacterEquippedSnapshotForCombat(
  playerId: string,
  characterId: number,
  equipmentSnapshot: EquippedSlots,
): Promise<SyncEquippedSnapshotResult> {
  const profile = getCharacterProfile(playerId, characterId);
  const merged = mergeAuthorizedEquippedSnapshot(
    profile.equipped,
    equipmentSnapshot,
    profile.inventory,
  );

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    store.setEquippedSlots(merged);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  return { ok: true, equipped: merged };
}

export async function consumeChargedEquipmentBattleParticipation(
  playerId: string,
  characterId: number,
): Promise<import('../shared/economy/chargedEquipmentBattle.js').ChargedEquipmentBattleConsumptionResult> {
  let consumption: import('../shared/economy/chargedEquipmentBattle.js').ChargedEquipmentBattleConsumptionResult = {
    runeChargesAfter: null,
    bookChargesAfter: null,
    runeDepleted: false,
    bookDepleted: false,
  };

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    consumption = store.consumeChargedEquipmentBattleParticipation();
  });

  if (!tx.ok) {
    return consumption;
  }

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(playerId, characterId, tx.inventorySnapshot),
  });

  return consumption;
}

export type BattleSurrenderPenaltyResult =
  | { readonly ok: true; readonly debited: number }
  | { readonly ok: false; readonly message: string };

/** Penalidade ao render-se — debita até BATTLE_SURRENDER_VOLT_PENALTY (saldo pode ser parcial). */
export async function debitBattleSurrenderPenalty(
  playerId: string,
  characterId: number,
  amount = BATTLE_SURRENDER_VOLT_PENALTY,
): Promise<BattleSurrenderPenaltyResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, message: 'Penalidade de rendição inválida.' };
  }

  let debited = 0;

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    debited = store.debitUpToDollarVolt(amount);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  if (debited > 0) {
    globalEventBus.emit({
      type: EconomyEventType.WalletUpdated,
      payload: {
        playerId,
        dollarVolt: tx.walletBalance,
        alterCoins: tx.alterCoins,
      },
    });
  }

  return { ok: true, debited };
}

export type ExchangeAlterCoinsRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly alterAmount: number;
  readonly intentId?: string;
};

export type ExchangeAlterCoinsResult =
  | { readonly ok: true; readonly payload: AlterExchangeCompletedPayload }
  | { readonly ok: false; readonly message: string };

/** Troca Alter Coins (premium) por Volts in-game — exclusivo via Mercado. */
export async function exchangeAlterCoinsForVolts(
  request: ExchangeAlterCoinsRequest,
): Promise<ExchangeAlterCoinsResult> {
  if (!isValidAlterExchangeAmount(request.alterAmount)) {
    return { ok: false, message: 'Informe uma quantidade inteira de Alter Coins.' };
  }

  const voltsGain = calculateVoltsFromAlterCoins(request.alterAmount);

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.spendAlterCoins(request.alterAmount);
      store.addDollarVolt(voltsGain);
    },
  );

  if (!tx.ok) {
    globalEventBus.emit({
      type: EconomyEventType.TransactionFailed,
      payload: {
        message: tx.message,
        ...(request.intentId !== undefined ? { intentId: request.intentId } : {}),
      },
    });
    return { ok: false, message: tx.message };
  }

  const payload: AlterExchangeCompletedPayload = {
    playerId: request.playerId,
    alterSpent: request.alterAmount,
    voltsReceived: voltsGain,
    dollarVolt: tx.walletBalance,
    alterCoins: tx.alterCoins,
    ...(request.intentId !== undefined ? { intentId: request.intentId } : {}),
  };

  globalEventBus.emit({ type: EconomyEventType.AlterExchangeCompleted, payload });
  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      ...(request.intentId !== undefined ? { intentId: request.intentId } : {}),
    },
  });

  return { ok: true, payload };
}

export type GrantAlterCoinsRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly amount: number;
};

/** Crédito de Alter Coins (compra externa / webhook de pagamento). */
export async function grantAlterCoinsFromPurchase(
  request: GrantAlterCoinsRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isInteger(request.amount) || request.amount <= 0) {
    return { ok: false, message: 'Quantidade de Alter Coins inválida.' };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.addAlterCoins(request.amount);
    },
  );

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
    },
  });

  return { ok: true };
}

export type BankDepositItemRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly itemId: string;
  readonly quantity?: number;
  readonly intentId?: string;
};

export type BankWithdrawItemRequest = BankDepositItemRequest;

export type BankCurrencyTransferRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly currency: BankCurrencyTypeId;
  readonly amount: number;
  readonly intentId?: string;
};

function emitBankSuccess(
  tx: Extract<BankEconomyTransactionResult, { ok: true }>,
  intentId?: string,
): void {
  const payload: UpdateBankSuccessPayload = {
    playerId: tx.playerId,
    characterId: tx.characterId,
    message: BANK_TRANSACTION_SUCCESS_MESSAGE,
    dollarVolt: tx.walletBalance,
    alterCoins: tx.alterCoins,
    inventory: tx.inventorySnapshot.map((row) => ({ ...row })),
    bankItemStacks: tx.bankItemStacks.map((row) => ({ ...row })),
    bankCurrencies: { ...tx.bankCurrencies },
    ...(intentId !== undefined ? { intentId } : {}),
  };

  globalEventBus.emit({ type: EconomyEventType.UpdateBankSuccess, payload });
  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: tx.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      ...(intentId !== undefined ? { intentId } : {}),
    },
  });
  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      tx.playerId,
      tx.characterId,
      tx.inventorySnapshot.map((row) => ({ ...row })),
      intentId !== undefined ? { intentId } : undefined,
    ),
  });
}

function emitBankFailure(message: string, intentId?: string): void {
  globalEventBus.emit({
    type: EconomyEventType.TransactionFailed,
    payload: { message, ...(intentId !== undefined ? { intentId } : {}) },
  });
}

function guardBankIntent(intentId?: string): { ok: true } | { ok: false; message: string } {
  if (!consumeBankIntent(intentId)) {
    return { ok: false, message: 'Transação bancária já foi processada.' };
  }
  return { ok: true };
}

export async function depositBankItem(
  request: BankDepositItemRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const intentGuard = guardBankIntent(request.intentId);
  if (!intentGuard.ok) {
    emitBankFailure(intentGuard.message, request.intentId);
    return intentGuard;
  }

  const result = await getBankTransactionManager().depositItem({
    playerId: request.playerId,
    characterId: request.characterId,
    itemId: request.itemId,
    ...(request.quantity !== undefined ? { quantity: request.quantity } : {}),
  });
  if (!result.ok) {
    emitBankFailure(result.message, request.intentId);
    return result;
  }
  emitBankSuccess(result.tx, request.intentId);
  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Trade,
    request.itemId,
    Math.max(1, Math.floor(request.quantity ?? 1)),
    'bank_deposit_item',
  );
  return { ok: true };
}

export async function withdrawBankItem(
  request: BankWithdrawItemRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const intentGuard = guardBankIntent(request.intentId);
  if (!intentGuard.ok) {
    emitBankFailure(intentGuard.message, request.intentId);
    return intentGuard;
  }

  const result = await getBankTransactionManager().withdrawItem({
    playerId: request.playerId,
    characterId: request.characterId,
    itemId: request.itemId,
    ...(request.quantity !== undefined ? { quantity: request.quantity } : {}),
  });
  if (!result.ok) {
    emitBankFailure(result.message, request.intentId);
    return result;
  }
  emitBankSuccess(result.tx, request.intentId);
  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Trade,
    request.itemId,
    Math.max(1, Math.floor(request.quantity ?? 1)),
    'bank_withdraw_item',
  );
  return { ok: true };
}

function guardBankCurrencyRequest(
  request: BankCurrencyTransferRequest,
): { ok: true; currency: BankCurrencyTypeId; amount: number } | { ok: false; message: string } {
  const intentGuard = guardBankIntent(request.intentId);
  if (!intentGuard.ok) return intentGuard;

  const validated = validateBankCurrencyRequest(request.currency, request.amount);
  if (!validated.ok) {
    return { ok: false, message: validated.reason };
  }
  return { ok: true, currency: validated.currency, amount: validated.amount };
}

export async function depositBankCurrency(
  request: BankCurrencyTransferRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const guard = guardBankCurrencyRequest(request);
  if (!guard.ok) {
    emitBankFailure(guard.message, request.intentId);
    return guard;
  }

  const result = await getBankTransactionManager().depositCurrency({
    playerId: request.playerId,
    characterId: request.characterId,
    currency: guard.currency,
    amount: guard.amount,
  });
  if (!result.ok) {
    emitBankFailure(result.message, request.intentId);
    return result;
  }
  emitBankSuccess(result.tx, request.intentId);
  return { ok: true };
}

export async function withdrawBankCurrency(
  request: BankCurrencyTransferRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const guard = guardBankCurrencyRequest(request);
  if (!guard.ok) {
    emitBankFailure(guard.message, request.intentId);
    return guard;
  }

  const result = await getBankTransactionManager().withdrawCurrency({
    playerId: request.playerId,
    characterId: request.characterId,
    currency: guard.currency,
    amount: guard.amount,
  });
  if (!result.ok) {
    emitBankFailure(result.message, request.intentId);
    return result;
  }
  emitBankSuccess(result.tx, request.intentId);
  return { ok: true };
}

export type RefractionBoothEconomyRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly amountVolts: number;
};

/** Débito de entrada do Estande de Refração — sem reembolso automático. */
export async function debitRefractionBoothEntry(
  request: RefractionBoothEconomyRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.spendDollarVolt(request.amountVolts);
    },
  );

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
    },
  });

  return { ok: true };
}

/** Crédito de prêmio do Estande de Refração — respeita cap diário no serviço. */
export async function creditRefractionBoothPrize(
  request: RefractionBoothEconomyRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isInteger(request.amountVolts) || request.amountVolts <= 0) {
    return { ok: false, message: 'Prêmio inválido.' };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.addDollarVolt(request.amountVolts);
    },
  );

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
    },
  });

  return { ok: true };
}

export type SyncEquipmentLoadoutGatewayResult =
  | { readonly ok: true; readonly loadout: PlayerLoadoutData; readonly inventory: InventoryStack[] }
  | { readonly ok: false; readonly message: string };

/** Sincroniza grade visual do SET — transação atômica + evento de inventário. */
export async function syncEquipmentLoadoutFromGrid(
  playerId: string,
  characterId: number,
  loadoutData: PlayerLoadoutData,
  intentId?: string,
): Promise<SyncEquipmentLoadoutGatewayResult> {
  const profile = getCharacterProfile(playerId, characterId);
  const currentGrid = profile.equipmentUiGrid ?? equippedToEquipmentUiGrid(profile.equipped);
  const normalized = normalizePlayerLoadoutData({
    equipmentUiGrid: sanitizeEquipmentUiGrid(loadoutData.equipmentUiGrid),
    ...(loadoutData.equipped !== undefined ? { equipped: loadoutData.equipped } : {}),
  });

  if (!validateLoadoutTransition(normalized.equipmentUiGrid, profile.inventory, currentGrid)) {
    return { ok: false, message: 'Loadout inválido — item indisponível ou slot incorreto.' };
  }

  let inventorySnapshot: InventoryStack[] = [];

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    const transition = applyEquipmentUiGridTransition(
      store.getInventory(),
      currentGrid,
      normalized.equipmentUiGrid,
    );
    if (!transition.ok) {
      switch (transition.reason) {
        case 'inventory_full':
          throw new Error('Inventário cheio — libere espaço antes de desequipar.');
        case 'empty':
          throw new Error('Nada equipado neste slot.');
        case 'invalid_slot':
        case 'not_equippable':
        case 'blocked_swap':
        case 'loadout_mismatch':
          throw new Error('Loadout inválido — item indisponível ou slot incorreto.');
        default: {
          const _exhaustive: never = transition.reason;
          throw new Error(_exhaustive);
        }
      }
    }

    store.setEquipmentUiGrid(transition.grid);
    store.setInventory(transition.inventory);
    inventorySnapshot = store.getInventory().map((row) => ({ ...row }));
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: {
      ...inventoryUpdatedPayload(playerId, characterId, inventorySnapshot, {
        ...(intentId ? { intentId } : {}),
      }),
      equipped: normalized.equipped ?? equipmentUiGridToEquipped(normalized.equipmentUiGrid),
      equipmentUiGrid: normalized.equipmentUiGrid,
    },
  });

  return { ok: true, loadout: normalized, inventory: inventorySnapshot };
}

export type EquipFromInventoryGatewayResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export async function equipFromInventoryItem(
  playerId: string,
  characterId: number,
  itemId: string,
  intentId?: string,
  preferredUiSlot?: EquipmentUiSlotId,
): Promise<EquipFromInventoryGatewayResult> {
  if (!itemId) {
    return { ok: false, message: 'Item indisponível neste slot.' };
  }

  const profile = getCharacterProfile(playerId, characterId);
  const loadout = getAuthoritativePlayerLoadout(playerId, characterId);
  const grid = loadout?.equipmentUiGrid
    ?? profile.equipmentUiGrid
    ?? equippedToEquipmentUiGrid(profile.equipped);
  const uiSlotId = resolveTargetUiSlotForEquip(grid, itemId, preferredUiSlot);
  if (!uiSlotId) {
    return { ok: false, message: 'Este item não pode ser equipado no SET.' };
  }

  const playerLevel = getAuthoritativeProgression(playerId, characterId).characterProfile.level ?? 1;
  const inventorySlots = stacksToInventorySlots(profile.inventory, INVENTORY_SLOT_COUNT);
  if (!canEquipItemWeight(
    { inventorySlots, equipment: grid, playerLevel },
    uiSlotId,
    itemId,
  )) {
    return { ok: false, message: CAPACITY_OVERLOAD_MESSAGE };
  }

  let inventorySnapshot: import('../shared/character/equipmentState.js').InventoryStack[] = [];

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    const result = applyEquipToUiGrid(
      store.getInventory(),
      store.getEquipmentUiGrid(),
      itemId,
      preferredUiSlot,
    );
    if (!result.ok) {
      switch (result.reason) {
        case 'invalid_slot':
          throw new Error('Item indisponível neste slot.');
        case 'not_equippable':
          throw new Error('Este item não pode ser equipado no SET.');
        case 'blocked_swap':
          throw new Error('Libere o slot do SET ou espaço no inventário antes de equipar outro item.');
        default: {
          const _exhaustive: never = result.reason;
          throw new Error(_exhaustive);
        }
      }
    }

    store.setInventory(result.inventory);
    store.setEquipmentUiGrid(result.grid);
    inventorySnapshot = store.getInventory().map((row) => ({ ...row }));
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(playerId, characterId);

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(playerId, characterId, inventorySnapshot, {
      ...(intentId ? { intentId } : {}),
    }),
  });

  return { ok: true };
}

/** @deprecated Use equipFromInventoryItem — slotIndex da UI não é confiável. */
export async function equipFromInventorySlot(
  playerId: string,
  characterId: number,
  _slotIndex: number,
  itemId: string,
  intentId?: string,
  preferredUiSlot?: EquipmentUiSlotId,
): Promise<EquipFromInventoryGatewayResult> {
  return equipFromInventoryItem(playerId, characterId, itemId, intentId, preferredUiSlot);
}

export async function unequipToInventorySlot(
  playerId: string,
  characterId: number,
  slotId: EquipmentUiSlotId,
  intentId?: string,
): Promise<EquipFromInventoryGatewayResult> {
  let inventorySnapshot: import('../shared/character/equipmentState.js').InventoryStack[] = [];

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    const result = applyUnequipFromUiGrid(
      store.getInventory(),
      store.getEquipmentUiGrid(),
      slotId,
    );
    if (!result.ok) {
      throw new Error(
        result.reason === 'inventory_full'
          ? 'Inventário cheio — libere espaço antes de desequipar.'
          : 'Nada equipado neste slot.',
      );
    }

    // Grid primeiro: setInventory dedupe usa o grid atual — se o slot ainda estiver
    // ocupado, o item recém-adicionado à mochila seria removido antes do snapshot.
    store.setEquipmentUiGrid(result.grid);
    store.setInventory(result.inventory);
    inventorySnapshot = store.getInventory().map((row) => ({ ...row }));
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(playerId, characterId);

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(playerId, characterId, inventorySnapshot, {
      ...(intentId ? { intentId } : {}),
    }),
  });

  return { ok: true };
}

function countInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
): number {
  let total = 0;
  for (const row of stacks) {
    if (row.itemId === itemId) {
      total += row.quantity;
    }
  }
  return total;
}

export type PurchaseNpcItemAtVendorRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly intentId?: string;
};

export type PurchaseNpcItemAtVendorResult =
  | {
      readonly ok: true;
      readonly itemId: string;
      readonly quantity: number;
      readonly totalVolts: number;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Compra em loja NPC — debita VOLTS e concede item (transação ACID). */
export async function purchaseNpcItemAtVendor(
  request: PurchaseNpcItemAtVendorRequest,
): Promise<PurchaseNpcItemAtVendorResult> {
  const listing = findNpcVendorListing(request.vendorId, request.itemId);
  if (!listing) {
    return { ok: false, code: 'ITEM_UNAVAILABLE', message: 'Item indisponível nesta loja.' };
  }

  const wallet = getPlayerWallet(request.playerId);
  const validation = validateNpcPurchase({
    listing,
    quantity: request.quantity,
    walletVolts: wallet.dollarVolt,
  });

  if (!validation.ok) {
    const code = validation.reason.includes('VOLTS insuficientes')
      ? 'INSUFFICIENT_FUNDS'
      : 'PURCHASE_REJECTED';
    const message = code === 'INSUFFICIENT_FUNDS'
      ? 'INSUFFICIENT_FUNDS: VOLTS insuficientes.'
      : validation.reason;
    return { ok: false, code, message };
  }

  const quote = validation.quote;
  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    (store) => {
      store.spendDollarVolt(quote.totalVolts);
      store.addInventoryItem(request.itemId, quote.quantity);
    },
  );

  if (!tx.ok) {
    return {
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      message: tx.message,
    };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(request.playerId, request.characterId);
  const revision = Date.now();

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.playerId,
      request.characterId,
      tx.inventorySnapshot,
      {
        revision,
        ...(request.intentId ? { intentId: request.intentId } : {}),
      },
    ),
  });

  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Trade,
    request.itemId,
    quote.quantity,
    `npc_vendor_purchase:${request.vendorId}`,
  );

  return {
    ok: true,
    itemId: request.itemId,
    quantity: quote.quantity,
    totalVolts: quote.totalVolts,
  };
}

export type SellNpcItemAtVendorRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly intentId?: string;
};

export type SellNpcItemAtVendorResult =
  | {
      readonly ok: true;
      readonly itemId: string;
      readonly quantity: number;
      readonly totalVolts: number;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Revenda ao NPC — remove item do inventário e credita VOLTS (transação ACID). */
export async function sellNpcItemAtVendor(
  request: SellNpcItemAtVendorRequest,
): Promise<SellNpcItemAtVendorResult> {
  try {
    assertSellItemAllowed(request.itemId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Item não pode ser vendido.';
    return { ok: false, code: 'SELL_REJECTED', message };
  }

  const economyProfile = getCharacterProfile(request.playerId, request.characterId);
  const owned = countInventoryQuantity(economyProfile.inventory, request.itemId);
  const validation = validateInventoryItemSale({
    itemId: request.itemId,
    quantity: request.quantity,
    inventoryQuantity: owned,
  });

  if (!validation.ok) {
    return { ok: false, code: 'SELL_REJECTED', message: validation.reason };
  }

  const quote = validation.quote;
  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    (store) => {
      store.removeInventoryItem(request.itemId, quote.quantity);
      store.addDollarVolt(quote.totalVolts);
    },
  );

  if (!tx.ok) {
    return {
      ok: false,
      code: 'SELL_REJECTED',
      message: tx.message,
    };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(request.playerId, request.characterId);
  const revision = Date.now();

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.playerId,
      request.characterId,
      tx.inventorySnapshot,
      {
        revision,
        ...(request.intentId ? { intentId: request.intentId } : {}),
      },
    ),
  });

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Sell,
    request.itemId,
    quote.quantity,
    `npc_vendor_sell:${request.vendorId}`,
  );

  return {
    ok: true,
    itemId: request.itemId,
    quantity: quote.quantity,
    totalVolts: quote.totalVolts,
  };
}

export type ApplyNpcHealEconomyRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly voltsCost: number;
  readonly vitals: PlayerWorldVitals;
  readonly message: string;
  readonly intentId?: string;
};

export type ApplyNpcHealEconomyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Parte econômica da cura NPC — debita VOLTS e emite WalletUpdated + WorldVitalsUpdated. */
export async function applyNpcHealEconomy(
  request: ApplyNpcHealEconomyRequest,
): Promise<ApplyNpcHealEconomyResult> {
  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    (store) => {
      if (request.voltsCost > 0) {
        store.spendDollarVolt(request.voltsCost);
      }
    },
  );

  if (!tx.ok) {
    return {
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      message: tx.message,
    };
  }

  const revision = Date.now();

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.WorldVitalsUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      vitals: request.vitals,
      message: request.message,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  return { ok: true };
}

export type BuyCaelPetRationRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly npcId: string;
  readonly intentId?: string;
};

export type BuyCaelPetRationResult =
  | {
      readonly ok: true;
      readonly chargesGranted: number;
      readonly totalRationCharges: number;
      readonly priceVolts: number;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Compra ração especial no Ancião Cael — debita VOLTS e credita cargas (transação ACID). */
export async function buyCaelPetRationAtNpc(
  request: BuyCaelPetRationRequest,
): Promise<BuyCaelPetRationResult> {
  const wallet = getPlayerWallet(request.playerId);
  const validation = validateCaelRationPurchase({
    npcId: request.npcId,
    walletVolts: wallet.dollarVolt,
  });

  if (!validation.ok) {
    const code = validation.reason.includes('Volts')
      ? 'INSUFFICIENT_FUNDS'
      : 'RATION_PURCHASE_REJECTED';
    return { ok: false, code, message: validation.reason };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.spendDollarVolt(validation.priceVolts);
    },
  );

  if (!tx.ok) {
    return {
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      message: tx.message,
    };
  }

  const totalRationCharges = addRationCharges(
    request.playerId,
    request.characterId,
    validation.chargesGranted,
  );
  const affinity = getPetAffinityRecord(request.playerId, request.characterId);
  const revision = Date.now();

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.PetAffinityUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      rationCharges: totalRationCharges,
      lastPetRationFeedAtMs: affinity.lastPetRationFeedAtMs,
      lastPetAffectionAtMs: affinity.lastPetAffectionAtMs,
      message: `Ração Especial adquirida (−${formatVolts(validation.priceVolts)}). +${validation.chargesGranted} cargas na HUD Pet Love (${totalRationCharges} no total).`,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  return {
    ok: true,
    chargesGranted: validation.chargesGranted,
    totalRationCharges,
    priceVolts: validation.priceVolts,
  };
}

export type PurchasePetAtTrainerRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly vendorId: string;
  readonly kindId: PetKindId;
  readonly name: string;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
  readonly intentId?: string;
};

export type PurchasePetAtTrainerResult =
  | { readonly ok: true; readonly petName: string; readonly priceVolts: number }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Adoção no Treinador Zeno — debita VOLTS e adiciona pet ao roster (ACID + rollback). */
export async function purchasePetAtTrainer(
  request: PurchasePetAtTrainerRequest,
): Promise<PurchasePetAtTrainerResult> {
  const wallet = getPlayerWallet(request.playerId);
  const roster = getPetRosterSnapshot(request.playerId, request.characterId);

  if (rosterHasPetKind(roster, request.kindId)) {
    return {
      ok: false,
      code: 'PET_KIND_ALREADY_OWNED',
      message: 'Você já possui este tipo de companheiro.',
    };
  }

  const validation = validatePetPurchase({
    vendorId: request.vendorId,
    kindId: request.kindId,
    name: request.name,
    colorId: request.colorId,
    gender: request.gender,
    walletVolts: wallet.dollarVolt,
    ownedPetCount: roster.pets.length,
  });

  if (!validation.ok) {
    const code = validation.reason.includes('VOLTS')
      ? 'INSUFFICIENT_FUNDS'
      : 'PET_PURCHASE_REJECTED';
    return { ok: false, code, message: validation.reason };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.spendDollarVolt(validation.quote.priceVolts);
    },
  );

  if (!tx.ok) {
    return {
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      message: tx.message,
    };
  }

  const adopted = buildAdoptedPet(validation.adoption);
  const nextRoster = adoptPetOnServer(request.playerId, request.characterId, adopted);
  if (!nextRoster) {
    await executeEconomyTransaction(
      request.playerId,
      request.characterId,
      async (store) => {
        store.addDollarVolt(validation.quote.priceVolts);
      },
    );
    return {
      ok: false,
      code: 'PET_ROSTER_FULL',
      message: 'Roster de companheiros cheio.',
    };
  }

  const revision = Date.now();
  const message = `${validation.adoption.name} adotado com sucesso!`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.PetRosterUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      pets: nextRoster.pets,
      activeSlotIndex: nextRoster.activeSlotIndex,
      selectedSlotIndex: nextRoster.selectedSlotIndex,
      message,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  return {
    ok: true,
    petName: validation.adoption.name,
    priceVolts: validation.quote.priceVolts,
  };
}

export type CraftItemGatewayRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly craftStationId: string;
  readonly recipeId: string;
  readonly quantity: number;
  readonly intentId?: string;
};

export type CraftItemGatewayResult =
  | {
      readonly ok: true;
      readonly outputItemId: string;
      readonly outputQuantity: number;
      readonly batches: number;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Craft atômico — consome materiais e concede output numa única transação ACID. */
export async function craftItemAtStation(
  request: CraftItemGatewayRequest,
): Promise<CraftItemGatewayResult> {
  const profile = getCharacterProfile(request.playerId, request.characterId);
  const validation = validateCraftItemRequest(
    {
      craftStationId: request.craftStationId,
      recipeId: request.recipeId,
      quantity: request.quantity,
    },
    profile.inventory,
  );

  if (!validation.ok) {
    return { ok: false, code: validation.code, message: validation.message };
  }

  const { recipe, batches } = validation;
  const outputQty = recipe.output.quantity * batches;
  let inventorySnapshot: import('../shared/character/equipmentState.js').InventoryStack[] = [];

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      for (const input of recipe.inputs) {
        store.removeInventoryItem(input.itemId, input.quantity * batches);
      }
      store.addInventoryItem(recipe.output.itemId, outputQty);
      inventorySnapshot = store.getInventory().map((row) => ({ ...row }));
    },
  );

  if (!tx.ok) {
    return { ok: false, code: 'CRAFT_FAILED', message: tx.message };
  }

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.playerId,
      request.characterId,
      inventorySnapshot,
      {
        ...(request.intentId ? { intentId: request.intentId } : {}),
        revision: Date.now(),
      },
    ),
  });

  const craftReason = `craft_station:${request.craftStationId}:${request.recipeId}`;
  for (const input of recipe.inputs) {
    auditEconomyMutation(
      request.playerId,
      EconomyAuditAction.Craft,
      input.itemId,
      input.quantity * batches,
      `${craftReason}:consume`,
    );
  }
  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Craft,
    recipe.output.itemId,
    outputQty,
    `${craftReason}:produce`,
  );

  return {
    ok: true,
    outputItemId: recipe.output.itemId,
    outputQuantity: outputQty,
    batches,
  };
}

export type DeleteInventoryItemRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly itemId: string;
  readonly quantity?: number;
  readonly slotIndex?: number;
  readonly intentId?: string;
};

export type DeleteInventoryItemResult =
  | { readonly ok: true; readonly itemId: string; readonly quantity: number }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Descarte autoritativo — remove item do inventário (política inventoryPolicy). */
export async function deleteInventoryItem(
  request: DeleteInventoryItemRequest,
): Promise<DeleteInventoryItemResult> {
  const quantity = Math.max(1, Math.floor(request.quantity ?? 1));
  const profile = getCharacterProfile(request.playerId, request.characterId);
  const slotState = request.slotIndex !== undefined
    ? profile.inventory.find((row) => row.itemId === request.itemId)
    : undefined;

  const policy = validateInventoryDeleteIntent({
    itemId: request.itemId,
    quantity,
    inventoryStacks: profile.inventory,
    ...(slotState
      ? {
          slotQuantity: slotState.quantity,
          lockedQuantity: slotState.lockedQuantity,
        }
      : {}),
  });

  if (!policy.ok) {
    return { ok: false, code: 'DELETE_REJECTED', message: policy.reason };
  }

  const available = profile.inventory
    .filter((row) => row.itemId === request.itemId)
    .reduce((total, row) => total + resolveAvailableStackQuantity(row), 0);

  if (quantity > available) {
    return {
      ok: false,
      code: 'DELETE_REJECTED',
      message: 'Quantidade indisponível (itens bloqueados ou insuficientes).',
    };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    (store) => {
      store.removeInventoryItem(request.itemId, quantity);
    },
  );

  if (!tx.ok) {
    return { ok: false, code: 'DELETE_FAILED', message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(request.playerId, request.characterId);
  const revision = Date.now();

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      request.playerId,
      request.characterId,
      tx.inventorySnapshot,
      {
        revision,
        ...(request.intentId ? { intentId: request.intentId } : {}),
      },
    ),
  });

  auditEconomyMutation(
    request.playerId,
    EconomyAuditAction.Drop,
    request.itemId,
    quantity,
    'inventory_delete',
  );

  return { ok: true, itemId: request.itemId, quantity };
}

export type GiftTransferValidationInput = {
  readonly senderPlayerId: string;
  readonly senderCharacterId: number;
  readonly itemId: string;
  readonly quantity?: number;
};

export type GiftTransferValidationResult =
  | { readonly ok: true; readonly quantity: number }
  | { readonly ok: false; readonly message: string };

/** Pré-validação autoritativa — policy + quantidade disponível (sem mutação). */
export function validateGiftTransferRequest(
  input: GiftTransferValidationInput,
): GiftTransferValidationResult {
  const itemId = input.itemId.trim();
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));

  if (!itemId) {
    return { ok: false, message: 'Item inválido.' };
  }

  try {
    assertTransferItemAllowed(itemId);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Transferência não permitida.',
    };
  }

  const profile = getCharacterProfile(input.senderPlayerId, input.senderCharacterId);
  const available = profile.inventory
    .filter((row) => row.itemId === itemId)
    .reduce((total, row) => total + resolveAvailableStackQuantity(row), 0);

  if (available <= 0) {
    return { ok: false, message: 'Quantidade insuficiente no inventário.' };
  }

  if (quantity > available) {
    return { ok: false, message: 'Quantidade insuficiente no inventário.' };
  }

  return { ok: true, quantity };
}

/** Pós-RPC — sync inventário remetente + audit TRADE. */
export function finalizeGiftTransferSender(
  senderPlayerId: string,
  senderCharacterId: number,
  transfer: GiftTransferSuccess,
): void {
  setCharacterInventoryStacks(senderPlayerId, senderCharacterId, transfer.senderStacks);

  publishInventoryUpdated(senderPlayerId, senderCharacterId, transfer.senderStacks);

  auditEconomyMutation(
    senderPlayerId,
    EconomyAuditAction.Trade,
    transfer.itemId,
    transfer.quantity,
    `gift_to:${transfer.targetPlayerId}`,
  );
}

export type FeedPetSpecialRationRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly slotIndex?: number;
  readonly intentId?: string;
};

export type FeedPetSpecialRationResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Alimenta pet com ração especial — consome carga e aplica cuidado autoritativo. */
export async function feedPetSpecialRation(
  request: FeedPetSpecialRationRequest,
): Promise<FeedPetSpecialRationResult> {
  const roster = getPetRosterSnapshot(request.playerId, request.characterId);
  const slotIndex = clampPetSlotIndex(request.slotIndex ?? roster.selectedSlotIndex);
  const pet = roster.pets[slotIndex] ?? null;
  const affinity = getPetAffinityRecord(request.playerId, request.characterId);

  const validation = validatePetFeedSpecialRation({
    rationCharges: affinity.rationCharges,
    hasSelectedPet: pet !== null,
    petDefeated: pet ? pet.hpCurrent <= 0 : false,
    lastFeedAtMs: affinity.lastPetRationFeedAtMs,
  });

  if (!validation.ok) {
    return { ok: false, code: 'PET_FEED_REJECTED', message: validation.reason };
  }

  if (!consumeRationCharge(request.playerId, request.characterId)) {
    return {
      ok: false,
      code: 'NO_RATION_CHARGES',
      message: 'Sem cargas de ração — compre no Ancião Cael.',
    };
  }

  const feedResult = applyPetDirectFeed(pet!);
  if (!feedResult.ok) {
    addRationCharges(request.playerId, request.characterId, 1);
    return { ok: false, code: 'PET_FEED_FAILED', message: feedResult.reason };
  }

  const nextRoster = updatePetAtSlot(
    request.playerId,
    request.characterId,
    slotIndex,
    feedResult.pet,
  );

  if (!nextRoster) {
    addRationCharges(request.playerId, request.characterId, 1);
    return { ok: false, code: 'PET_NOT_FOUND', message: 'Companheiro não encontrado.' };
  }

  recordPetRationFeedAt(request.playerId, request.characterId);
  const updatedAffinity = getPetAffinityRecord(request.playerId, request.characterId);
  const revision = Date.now();
  const message = `Alimentação em ${pet!.name}. Felicidade restaurada, envelhecimento pausado por 24 h e +${formatPetAffinityGainPercent(feedResult.affinityGainRatio)}% de afinidade. Cargas restantes: ${updatedAffinity.rationCharges}.`;

  globalEventBus.emit({
    type: EconomyEventType.PetRosterUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      pets: nextRoster.pets,
      activeSlotIndex: nextRoster.activeSlotIndex,
      selectedSlotIndex: nextRoster.selectedSlotIndex,
      message,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.PetAffinityUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      rationCharges: updatedAffinity.rationCharges,
      lastPetRationFeedAtMs: updatedAffinity.lastPetRationFeedAtMs,
      lastPetAffectionAtMs: updatedAffinity.lastPetAffectionAtMs,
      revision,
    },
  });

  return { ok: true, message };
}

export type PurchaseSkinRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly slot: SkinSlotId;
  readonly optionId: string;
  readonly intentId?: string;
};

export type PurchaseSkinResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Compra cosmético na loja de skins — debita VOLTS e registra ownership. */
export async function purchaseSkinAtShop(
  request: PurchaseSkinRequest,
): Promise<PurchaseSkinResult> {
  const item = getSkinShopItem(request.slot, request.optionId);
  if (!item) {
    return { ok: false, code: 'SKIN_INVALID', message: 'Item de loja inválido.' };
  }

  if (ownsSkinOption(request.playerId, request.characterId, request.slot, request.optionId)) {
    return { ok: false, code: 'SKIN_ALREADY_OWNED', message: 'Você já possui esta peça.' };
  }

  const wallet = getPlayerWallet(request.playerId);
  if (wallet.dollarVolt < item.price) {
    return { ok: false, code: 'INSUFFICIENT_FUNDS', message: 'DOLLAR VOLT insuficiente.' };
  }

  const tx = await executeEconomyTransaction(
    request.playerId,
    request.characterId,
    async (store) => {
      store.spendDollarVolt(item.price);
    },
  );

  if (!tx.ok) {
    return { ok: false, code: 'INSUFFICIENT_FUNDS', message: tx.message };
  }

  const ownedSkins = addOwnedSkinOption(
    request.playerId,
    request.characterId,
    request.slot,
    request.optionId,
  );
  const revision = Date.now();
  const message = `Peça cosmética adquirida: ${item.name} (−${formatVolts(item.price)}).`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: request.playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.SkinOwnershipUpdated,
    payload: {
      playerId: request.playerId,
      characterId: request.characterId,
      ownedSkins,
      message,
      revision,
      ...(request.intentId ? { intentId: request.intentId } : {}),
    },
  });

  return { ok: true, message };
}

export { ALTER_TO_VOLTS_EXCHANGE_RATE };
