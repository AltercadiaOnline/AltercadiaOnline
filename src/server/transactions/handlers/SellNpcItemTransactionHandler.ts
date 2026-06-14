import type { InventoryStack } from '../../../shared/character/equipmentState.js';
import { EconomyEventType } from '../../../shared/economy/events.js';
import type { NpcTradeQuote } from '../../../shared/economy/npcVendorService.js';
import { validateInventoryItemSale } from '../../../shared/economy/npcVendorService.js';
import { assertSellItemAllowed } from '../../../Economy/InventoryService.js';
import {
  executeEconomyTransaction,
  getCharacterProfile,
} from '../../../Economy/economyStore.js';
import type { PlayerProfile } from '../../models/playerProfile.js';
import { BaseTransactionHandler } from '../BaseTransactionHandler.js';
import {
  TransactionValidationError,
  type TransactionIntentAction,
  type TransactionResult,
} from '../transactionTypes.js';

export type SellNpcItemPayload = {
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
};

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

/** Handler vendor — SELL_NPC_ITEM (revenda ao NPC). */
export class SellNpcItemTransactionHandler extends BaseTransactionHandler<SellNpcItemPayload> {
  readonly actionType = 'SELL_NPC_ITEM';

  private pendingQuote: NpcTradeQuote | null = null;
  private lastVoltsCredited = 0;
  private lastItemRemoved: { readonly itemId: string; readonly quantity: number } | null = null;

  validate(
    action: TransactionIntentAction<SellNpcItemPayload>,
    _profile: PlayerProfile,
  ): void {
    void _profile;

    try {
      assertSellItemAllowed(action.payload.itemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Item não pode ser vendido.';
      throw new TransactionValidationError('SELL_REJECTED', message);
    }

    const economyProfile = getCharacterProfile(action.playerId, action.characterId);
    const owned = countInventoryQuantity(economyProfile.inventory, action.payload.itemId);

    const validation = validateInventoryItemSale({
      itemId: action.payload.itemId,
      quantity: action.payload.quantity,
      inventoryQuantity: owned,
    });

    if (!validation.ok) {
      throw new TransactionValidationError('SELL_REJECTED', validation.reason);
    }

    this.pendingQuote = validation.quote;
  }

  async runTransaction(
    action: TransactionIntentAction<SellNpcItemPayload>,
    _profile: PlayerProfile,
  ): Promise<TransactionResult> {
    void _profile;

    this.lastVoltsCredited = 0;
    this.lastItemRemoved = null;

    const quote = this.pendingQuote;
    if (!quote) {
      return { ok: false, code: 'SELL_REJECTED', message: 'Cotação de venda inválida.' };
    }

    return this.runAtomicVendorTransaction(action, {
      economyMutate: (store) => {
        store.removeInventoryItem(action.payload.itemId, quote.quantity);
        store.addDollarVolt(quote.totalVolts);
        this.lastVoltsCredited = quote.totalVolts;
        this.lastItemRemoved = {
          itemId: action.payload.itemId,
          quantity: quote.quantity,
        };
      },
      persistAuthoritativeState: async () => {
        // Inventário e carteira persistidos via economyStore na transação ACID.
      },
      buildSuccessEvents: (tx) => {
        const revision = Date.now();
        return [
          this.buildStandardInventoryUpdatedEvent(action, tx, revision),
          {
            type: EconomyEventType.WalletUpdated,
            payload: {
              playerId: action.playerId,
              dollarVolt: tx.walletBalance,
              alterCoins: tx.alterCoins,
              revision,
            },
          },
        ];
      },
    });
  }

  async rollback(
    action: TransactionIntentAction<SellNpcItemPayload>,
    _reason: string,
  ): Promise<void> {
    const credit = this.lastVoltsCredited;
    const removed = this.lastItemRemoved;

    this.lastVoltsCredited = 0;
    this.lastItemRemoved = null;
    this.pendingQuote = null;

    if (credit <= 0 && !removed) return;

    await executeEconomyTransaction(action.playerId, action.characterId, (store) => {
      if (credit > 0) {
        store.spendDollarVolt(credit);
      }
      if (removed) {
        store.addInventoryItem(removed.itemId, removed.quantity);
      }
    });
  }
}

let sellHandler: SellNpcItemTransactionHandler | null = null;

export function getSellNpcItemTransactionHandler(): SellNpcItemTransactionHandler {
  if (!sellHandler) sellHandler = new SellNpcItemTransactionHandler();
  return sellHandler;
}

export function resetSellNpcItemTransactionHandler(): void {
  sellHandler = null;
}
