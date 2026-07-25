// @ts-nocheck
import { EconomyEventType } from '../../shared/economy/events.js';
import { equippedToEquipmentUiGrid } from '../../shared/character/equipmentUiSlots.js';
import { executeEconomyTransaction, getAuthoritativePlayerLoadout, getCharacterProfile, getPlayerWallet, syncAuthoritativeLoadoutFromEconomyProfile, } from '../../Economy/economyStore.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import { getWorldProfile } from '../world/worldProfileStore.js';
import { buildIntentFailure, buildIntentSuccess, buildGatewayIntentActionFromExecute, resolveIntentErrorCode, } from '../../shared/intent/intentProtocol.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import { TransactionValidationError } from './transactionTypes.js';
/**
 * Classe base para handlers vendor/intent — validate → execute (atômico) → rollback.
 */
export class BaseTransactionHandler {
    async execute(playerId, characterId, payload, intentId) {
        return this.handleIntent(buildGatewayIntentActionFromExecute(this.actionType, playerId, characterId, payload, intentId));
    }
    async handleIntent(action) {
        const profile = getWorldProfile(action.playerId, action.characterId);
        try {
            this.validate(action, profile);
        }
        catch (error) {
            const validationCode = error instanceof TransactionValidationError ? error.code : undefined;
            const message = error instanceof TransactionValidationError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Validação da intenção falhou.';
            this.emitIntentFailure(action, message);
            await this.rollback(action, message);
            return buildIntentFailure(action.intentId, resolveIntentErrorCode(exactOptionalProps({ code: validationCode, message })), message);
        }
        try {
            const result = await this.runTransaction(action, profile);
            if (!result.ok) {
                this.emitIntentFailure(action, result.message);
                await this.rollback(action, result.message);
                return buildIntentFailure(action.intentId, resolveIntentErrorCode(exactOptionalProps({ code: result.code, message: result.message })), result.message);
            }
            this.emitIntentSuccess(action, result.events);
            return buildIntentSuccess(action.intentId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Falha ao processar intenção.';
            this.emitIntentFailure(action, message);
            await this.rollback(action, message);
            return buildIntentFailure(action.intentId, resolveIntentErrorCode({ message }), message);
        }
    }
    assertVoltsBalance(action, requiredVolts) {
        if (requiredVolts <= 0)
            return;
        const wallet = getPlayerWallet(action.playerId);
        if (wallet.dollarVolt < requiredVolts) {
            throw new TransactionValidationError('INSUFFICIENT_FUNDS', 'INSUFFICIENT_FUNDS: VOLTS insuficientes.');
        }
    }
    buildStandardInventoryUpdatedEvent(action, tx, revision) {
        const economyProfile = getCharacterProfile(action.playerId, action.characterId);
        const loadout = getAuthoritativePlayerLoadout(action.playerId, action.characterId);
        const equipmentUiGrid = loadout?.equipmentUiGrid
            ?? economyProfile.equipmentUiGrid
            ?? equippedToEquipmentUiGrid(economyProfile.equipped);
        const equipped = loadout?.equipped ?? economyProfile.equipped;
        return {
            type: EconomyEventType.InventoryUpdated,
            payload: {
                playerId: action.playerId,
                characterId: action.characterId,
                items: tx.inventorySnapshot.map((row) => ({ ...row })),
                equipped,
                equipmentUiGrid,
                revision,
            },
        };
    }
    async runAtomicVendorTransaction(action, steps) {
        const tx = await executeEconomyTransaction(action.playerId, action.characterId, steps.economyMutate);
        if (!tx.ok) {
            return {
                ok: false,
                code: 'INSUFFICIENT_FUNDS',
                message: `INSUFFICIENT_FUNDS: ${tx.message}`,
            };
        }
        try {
            await steps.persistAuthoritativeState();
            syncAuthoritativeLoadoutFromEconomyProfile(action.playerId, action.characterId);
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Falha ao persistir estado autoritativo.';
            return { ok: false, code: 'PERSIST_FAILED', message };
        }
        const events = steps.buildSuccessEvents(tx).map((event) => this.attachIntentId(event, action.intentId, action.playerId));
        return { ok: true, events };
    }
    attachIntentId(event, intentId, playerId) {
        return {
            type: event.type,
            payload: {
                ...event.payload,
                intentId,
                playerId,
            },
        };
    }
    emitIntentFailure(action, message) {
        globalEventBus.emit({
            type: EconomyEventType.TransactionFailed,
            payload: {
                message,
                intentId: action.intentId,
                playerId: action.playerId,
            },
        });
    }
    emitIntentSuccess(action, events) {
        for (const event of events) {
            globalEventBus.emit(this.attachIntentId(event, action.intentId, action.playerId));
        }
    }
}
