// @ts-nocheck
import { EconomyEventType } from '../../../shared/economy/events.js';
import { findNpcVendorListing } from '../../../shared/economy/npcVendorCatalog.js';
import { validateNpcPurchase } from '../../../shared/economy/npcVendorService.js';
import { executeEconomyTransaction, getPlayerWallet, } from '../../../Economy/economyStore.js';
import { BaseTransactionHandler } from '../BaseTransactionHandler.js';
import { TransactionValidationError, } from '../transactionTypes.js';
/**
 * Handler vendor — PURCHASE_NPC_ITEM (lojas NPC / laboratório).
 * Implementa IIntentHandler: sempre responde intentId + SUCCESS | FAILURE.
 */
export class PurchaseNpcItemTransactionHandler extends BaseTransactionHandler {
    actionType = 'PURCHASE_NPC_ITEM';
    pendingQuote = null;
    lastVoltsDebited = 0;
    lastItemGrant = null;
    validate(action, _profile) {
        const listing = findNpcVendorListing(action.payload.vendorId, action.payload.itemId);
        if (!listing) {
            throw new TransactionValidationError('ITEM_UNAVAILABLE', 'Item indisponível nesta loja.');
        }
        const wallet = getPlayerWallet(action.playerId);
        const validation = validateNpcPurchase({
            listing,
            quantity: action.payload.quantity,
            walletVolts: wallet.dollarVolt,
        });
        if (!validation.ok) {
            const code = validation.reason.includes('VOLTS insuficientes')
                ? 'INSUFFICIENT_FUNDS'
                : 'PURCHASE_REJECTED';
            const message = code === 'INSUFFICIENT_FUNDS'
                ? 'INSUFFICIENT_FUNDS: VOLTS insuficientes.'
                : validation.reason;
            throw new TransactionValidationError(code, message);
        }
        this.assertVoltsBalance(action, validation.quote.totalVolts);
        this.pendingQuote = validation.quote;
    }
    async runTransaction(action, _profile) {
        this.lastVoltsDebited = 0;
        this.lastItemGrant = null;
        const quote = this.pendingQuote;
        if (!quote) {
            return { ok: false, code: 'PURCHASE_REJECTED', message: 'Cotação de compra inválida.' };
        }
        return this.runAtomicVendorTransaction(action, {
            economyMutate: (store) => {
                store.spendDollarVolt(quote.totalVolts);
                this.lastVoltsDebited = quote.totalVolts;
                store.addInventoryItem(action.payload.itemId, quote.quantity);
                this.lastItemGrant = {
                    itemId: action.payload.itemId,
                    quantity: quote.quantity,
                };
            },
            persistAuthoritativeState: async () => {
                // Inventário autoritativo já persistido via economyStore na transação ACID.
            },
            buildSuccessEvents: (tx) => {
                const revision = Date.now();
                return [
                    {
                        type: EconomyEventType.WalletUpdated,
                        payload: {
                            playerId: action.playerId,
                            dollarVolt: tx.walletBalance,
                            alterCoins: tx.alterCoins,
                            revision,
                        },
                    },
                    this.buildStandardInventoryUpdatedEvent(action, tx, revision),
                ];
            },
        });
    }
    async rollback(action, _reason) {
        const refund = this.lastVoltsDebited;
        const grant = this.lastItemGrant;
        this.lastVoltsDebited = 0;
        this.lastItemGrant = null;
        this.pendingQuote = null;
        if (refund <= 0 && !grant)
            return;
        await executeEconomyTransaction(action.playerId, action.characterId, (store) => {
            if (refund > 0) {
                store.addDollarVolt(refund);
            }
            if (grant) {
                store.removeInventoryItem(grant.itemId, grant.quantity);
            }
        });
    }
}
let purchaseHandler = null;
export function getPurchaseNpcItemTransactionHandler() {
    if (!purchaseHandler)
        purchaseHandler = new PurchaseNpcItemTransactionHandler();
    return purchaseHandler;
}
export function resetPurchaseNpcItemTransactionHandler() {
    purchaseHandler = null;
}
