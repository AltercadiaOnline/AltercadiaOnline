// @ts-nocheck
import { EconomyEventType } from '../../../shared/economy/events.js';
import { validateInventoryItemSale } from '../../../shared/economy/npcVendorService.js';
import { assertSellItemAllowed } from '../../../Economy/InventoryService.js';
import { executeEconomyTransaction, getCharacterProfile, } from '../../../Economy/economyStore.js';
import { BaseTransactionHandler } from '../BaseTransactionHandler.js';
import { TransactionValidationError, } from '../transactionTypes.js';
function countInventoryQuantity(stacks, itemId) {
    let total = 0;
    for (const row of stacks) {
        if (row.itemId === itemId) {
            total += row.quantity;
        }
    }
    return total;
}
/** Handler vendor — SELL_NPC_ITEM (revenda ao NPC). */
export class SellNpcItemTransactionHandler extends BaseTransactionHandler {
    actionType = 'SELL_NPC_ITEM';
    pendingQuote = null;
    lastVoltsCredited = 0;
    lastItemRemoved = null;
    validate(action, _profile) {
        void _profile;
        try {
            assertSellItemAllowed(action.payload.itemId);
        }
        catch (error) {
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
    async runTransaction(action, _profile) {
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
    async rollback(action, _reason) {
        const credit = this.lastVoltsCredited;
        const removed = this.lastItemRemoved;
        this.lastVoltsCredited = 0;
        this.lastItemRemoved = null;
        this.pendingQuote = null;
        if (credit <= 0 && !removed)
            return;
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
let sellHandler = null;
export function getSellNpcItemTransactionHandler() {
    if (!sellHandler)
        sellHandler = new SellNpcItemTransactionHandler();
    return sellHandler;
}
export function resetSellNpcItemTransactionHandler() {
    sellHandler = null;
}
