import {
  depositItemSwap,
  withdrawItemSwap,
  type BankWalletSnapshot,
} from '../shared/bank/bankService.js';
import { validateBankItemTransfer } from '../shared/bank/bankItemRules.js';
import {
  consumeInventoryQuantity,
  unlockInventoryQuantity,
  lockInventoryQuantity,
} from '../shared/bank/inventoryLockOps.js';
import { transferCurrency, type CurrencyKind } from '../shared/bank/bankCurrency.js';
import { validateBankCurrencyRequest } from '../shared/bank/bankCurrencyRules.js';
import type { BankCurrencyTypeId } from '../shared/bank/bankConstants.js';
import type { InventoryStack } from '../shared/character/equipmentState.js';
import {
  executeBankEconomyTransaction,
  getBankVaultState,
  getCharacterInventoryStacks,
  getPlayerWallet,
  lockWalletCurrency,
  setCharacterInventoryStacks,
  unlockWalletCurrency,
  type BankEconomyTransactionResult,
} from './economyStore.js';
import { getInventoryLockRegistry } from './inventoryLockRegistry.js';

export type BankOperationResult =
  | { readonly ok: true; readonly tx: Extract<BankEconomyTransactionResult, { ok: true }> }
  | { readonly ok: false; readonly message: string };

export type BankItemRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly itemId: string;
  readonly quantity?: number;
};

export type BankCurrencyRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly currency: BankCurrencyTypeId;
  readonly amount: number;
};

function pendingKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export class BankTransactionManager {
  private readonly pending = new Set<string>();

  isPending(playerId: string, characterId: number): boolean {
    return this.pending.has(pendingKey(playerId, characterId));
  }

  private acquire(playerId: string, characterId: number): boolean {
    const key = pendingKey(playerId, characterId);
    if (this.pending.has(key)) return false;
    this.pending.add(key);
    return true;
  }

  private release(playerId: string, characterId: number): void {
    this.pending.delete(pendingKey(playerId, characterId));
  }

  async depositItem(request: BankItemRequest): Promise<BankOperationResult> {
    const quantity = Math.max(1, Math.floor(request.quantity ?? 1));
    if (!this.acquire(request.playerId, request.characterId)) {
      return { ok: false, message: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    let lockedQty = 0;
    try {
      const inventory = getCharacterInventoryStacks(request.playerId, request.characterId);
      const locked = lockInventoryQuantity(inventory, request.itemId, quantity);
      if (!locked.ok) {
        return { ok: false, message: locked.reason };
      }
      lockedQty = quantity;
      setCharacterInventoryStacks(request.playerId, request.characterId, locked.stacks);
      getInventoryLockRegistry().track({
        playerId: request.playerId,
        characterId: request.characterId,
        itemId: request.itemId,
        quantity: lockedQty,
        lockedAtMs: Date.now(),
      });

      const itemRules = validateBankItemTransfer(request.itemId, quantity);
      if (!itemRules.ok) {
        return { ok: false, message: itemRules.reason };
      }

      const bank = getBankVaultState(request.playerId, request.characterId);
      const preview = depositItemSwap(
        locked.stacks,
        bank.itemStacks,
        request.itemId,
        quantity,
      );
      if (!preview.ok) {
        return { ok: false, message: preview.reason };
      }

      const tx = await executeBankEconomyTransaction(
        request.playerId,
        request.characterId,
        (store) => {
          const consumed = consumeInventoryQuantity(store.getInventory(), request.itemId, quantity);
          if (!consumed.ok) {
            throw new Error(consumed.reason);
          }
          store.setInventory(consumed.stacks);
          store.setBank(preview.value.bankStacks, bank.currencies);
        },
      );

      if (!tx.ok) {
        return { ok: false, message: tx.message };
      }

      lockedQty = 0;
      getInventoryLockRegistry().untrack(request.playerId, request.characterId, request.itemId);
      return { ok: true, tx };
    } finally {
      if (lockedQty > 0) {
        const current = getCharacterInventoryStacks(request.playerId, request.characterId);
        setCharacterInventoryStacks(
          request.playerId,
          request.characterId,
          unlockInventoryQuantity(current, request.itemId, lockedQty),
        );
      }
      getInventoryLockRegistry().untrack(request.playerId, request.characterId, request.itemId);
      this.release(request.playerId, request.characterId);
    }
  }

  async withdrawItem(request: BankItemRequest): Promise<BankOperationResult> {
    const quantity = Math.max(1, Math.floor(request.quantity ?? 1));
    if (!this.acquire(request.playerId, request.characterId)) {
      return { ok: false, message: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    try {
      const itemRules = validateBankItemTransfer(request.itemId, quantity);
      if (!itemRules.ok) {
        return { ok: false, message: itemRules.reason };
      }

      const inventory = getCharacterInventoryStacks(request.playerId, request.characterId);
      const bank = getBankVaultState(request.playerId, request.characterId);
      const preview = withdrawItemSwap(inventory, bank.itemStacks, request.itemId, quantity);
      if (!preview.ok) {
        return { ok: false, message: preview.reason };
      }

      const tx = await executeBankEconomyTransaction(
        request.playerId,
        request.characterId,
        (store) => {
          store.setInventory(preview.value.inventoryStacks);
          store.setBank(preview.value.bankStacks, bank.currencies);
        },
      );

      if (!tx.ok) {
        return { ok: false, message: tx.message };
      }

      return { ok: true, tx };
    } finally {
      this.release(request.playerId, request.characterId);
    }
  }

  async depositCurrency(request: BankCurrencyRequest): Promise<BankOperationResult> {
    const validated = validateBankCurrencyRequest(request.currency, request.amount);
    if (!validated.ok) {
      return { ok: false, message: validated.reason };
    }

    const kind: CurrencyKind = validated.currency === 'volts' ? 'volts' : 'coins';
    const amount = validated.amount;
    if (!this.acquire(request.playerId, request.characterId)) {
      return { ok: false, message: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    let lockedAmount = 0;
    try {
      const lock = lockWalletCurrency(request.playerId, kind, amount);
      if (!lock.ok) {
        return { ok: false, message: lock.message };
      }
      lockedAmount = amount;

      const fullWallet = getPlayerWallet(request.playerId);
      const walletView: BankWalletSnapshot = {
        dollarVolt: fullWallet.dollarVolt,
        alterCoins: fullWallet.alterCoins,
      };
      const bank = getBankVaultState(request.playerId, request.characterId);
      const preview = transferCurrency(amount, 'wallet', kind, walletView, bank.currencies);
      if (!preview.ok) {
        return { ok: false, message: preview.reason };
      }

      const tx = await executeBankEconomyTransaction(
        request.playerId,
        request.characterId,
        (store) => {
          store.applyWalletAndBank(preview.value.wallet, preview.value.bankCurrencies);
        },
      );

      if (!tx.ok) {
        return { ok: false, message: tx.message };
      }

      lockedAmount = 0;
      return { ok: true, tx };
    } finally {
      if (lockedAmount > 0) {
        unlockWalletCurrency(request.playerId, kind, lockedAmount);
      }
      this.release(request.playerId, request.characterId);
    }
  }

  async withdrawCurrency(request: BankCurrencyRequest): Promise<BankOperationResult> {
    const validated = validateBankCurrencyRequest(request.currency, request.amount);
    if (!validated.ok) {
      return { ok: false, message: validated.reason };
    }

    const kind: CurrencyKind = validated.currency === 'volts' ? 'volts' : 'coins';
    const amount = validated.amount;
    if (!this.acquire(request.playerId, request.characterId)) {
      return { ok: false, message: 'Aguarde a conclusão da transação bancária anterior.' };
    }

    try {
      const fullWallet = getPlayerWallet(request.playerId);
      const wallet: BankWalletSnapshot = {
        dollarVolt: fullWallet.dollarVolt,
        alterCoins: fullWallet.alterCoins,
      };
      const bank = getBankVaultState(request.playerId, request.characterId);
      const preview = transferCurrency(amount, 'vault', kind, wallet, bank.currencies);
      if (!preview.ok) {
        return { ok: false, message: preview.reason };
      }

      const tx = await executeBankEconomyTransaction(
        request.playerId,
        request.characterId,
        (store) => {
          store.applyWalletAndBank(preview.value.wallet, preview.value.bankCurrencies);
        },
      );

      if (!tx.ok) {
        return { ok: false, message: tx.message };
      }

      return { ok: true, tx };
    } finally {
      this.release(request.playerId, request.characterId);
    }
  }
}

let singleton: BankTransactionManager | null = null;

export function getBankTransactionManager(): BankTransactionManager {
  if (!singleton) {
    singleton = new BankTransactionManager();
  }
  return singleton;
}
