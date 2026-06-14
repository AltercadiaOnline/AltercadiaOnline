import type { EconomyEvent } from '../../shared/economy/events.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { equippedToEquipmentUiGrid } from '../../shared/character/equipmentUiSlots.js';
import type { EconomyStoreMutator, EconomyTransactionResult } from '../../Economy/economyStore.js';
import {
  executeEconomyTransaction,
  getAuthoritativePlayerLoadout,
  getCharacterProfile,
  getPlayerWallet,
  syncAuthoritativeLoadoutFromEconomyProfile,
} from '../../Economy/economyStore.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import type { PlayerProfile } from '../models/playerProfile.js';
import { getWorldProfile } from '../world/worldProfileStore.js';
import type { IntentResponse } from '../../shared/intent/intentProtocol.js';
import {
  buildIntentFailure,
  buildIntentSuccess,
  buildGatewayIntentActionFromExecute,
  resolveIntentErrorCode,
} from '../../shared/intent/intentProtocol.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import type { ILegacyIntentHandler } from './IIntentHandler.js';
import type {
  TransactionIntentAction,
  TransactionResult,
} from './transactionTypes.js';
import { TransactionValidationError } from './transactionTypes.js';

export type AtomicVendorTransactionSteps = {
  readonly economyMutate: (store: EconomyStoreMutator) => void | Promise<void>;
  readonly persistAuthoritativeState: () => void | Promise<void>;
  readonly buildSuccessEvents: (
    tx: Extract<EconomyTransactionResult, { ok: true }>,
  ) => readonly EconomyEvent[];
};

/**
 * Classe base para handlers vendor/intent — validate → execute (atômico) → rollback.
 */
export abstract class BaseTransactionHandler<TPayload = unknown> implements ILegacyIntentHandler<TPayload> {
  abstract readonly actionType: string;

  abstract validate(
    action: TransactionIntentAction<TPayload>,
    profile: PlayerProfile,
  ): void;

  abstract runTransaction(
    action: TransactionIntentAction<TPayload>,
    profile: PlayerProfile,
  ): Promise<TransactionResult>;

  abstract rollback(
    action: TransactionIntentAction<TPayload>,
    reason: string,
  ): void | Promise<void>;

  async execute(
    playerId: string,
    characterId: number,
    payload: TPayload,
    intentId: string,
  ): Promise<IntentResponse> {
    return this.handleIntent(
      buildGatewayIntentActionFromExecute(
        this.actionType,
        playerId,
        characterId,
        payload,
        intentId,
      ),
    );
  }

  protected async handleIntent(
    action: TransactionIntentAction<TPayload>,
  ): Promise<IntentResponse> {
    const profile = getWorldProfile(action.playerId, action.characterId);

    try {
      this.validate(action, profile);
    } catch (error) {
      const validationCode = error instanceof TransactionValidationError ? error.code : undefined;
      const message = error instanceof TransactionValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Validação da intenção falhou.';
      this.emitIntentFailure(action, message);
      await this.rollback(action, message);
      return buildIntentFailure(
        action.intentId,
        resolveIntentErrorCode(exactOptionalProps({ code: validationCode, message })),
        message,
      );
    }

    try {
      const result = await this.runTransaction(action, profile);
      if (!result.ok) {
        this.emitIntentFailure(action, result.message);
        await this.rollback(action, result.message);
        return buildIntentFailure(
          action.intentId,
          resolveIntentErrorCode(exactOptionalProps({ code: result.code, message: result.message })),
          result.message,
        );
      }

      this.emitIntentSuccess(action, result.events);
      return buildIntentSuccess(action.intentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao processar intenção.';
      this.emitIntentFailure(action, message);
      await this.rollback(action, message);
      return buildIntentFailure(
        action.intentId,
        resolveIntentErrorCode({ message }),
        message,
      );
    }
  }

  protected assertVoltsBalance(
    action: TransactionIntentAction<TPayload>,
    requiredVolts: number,
  ): void {
    if (requiredVolts <= 0) return;

    const wallet = getPlayerWallet(action.playerId);
    if (wallet.dollarVolt < requiredVolts) {
      throw new TransactionValidationError(
        'INSUFFICIENT_FUNDS',
        'INSUFFICIENT_FUNDS: VOLTS insuficientes.',
      );
    }
  }

  protected buildStandardInventoryUpdatedEvent(
    action: TransactionIntentAction<TPayload>,
    tx: Extract<EconomyTransactionResult, { ok: true }>,
    revision: number,
  ): EconomyEvent {
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

  protected async runAtomicVendorTransaction(
    action: TransactionIntentAction<TPayload>,
    steps: AtomicVendorTransactionSteps,
  ): Promise<TransactionResult> {
    const tx = await executeEconomyTransaction(
      action.playerId,
      action.characterId,
      steps.economyMutate,
    );

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
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao persistir estado autoritativo.';
      return { ok: false, code: 'PERSIST_FAILED', message };
    }

    const events = steps.buildSuccessEvents(tx).map((event) =>
      this.attachIntentId(event, action.intentId, action.playerId),
    );

    return { ok: true, events };
  }

  protected attachIntentId(
    event: EconomyEvent,
    intentId: string,
    playerId: string,
  ): EconomyEvent {
    return {
      type: event.type,
      payload: {
        ...event.payload,
        intentId,
        playerId,
      },
    } as EconomyEvent;
  }

  protected emitIntentFailure(
    action: TransactionIntentAction<TPayload>,
    message: string,
  ): void {
    globalEventBus.emit({
      type: EconomyEventType.TransactionFailed,
      payload: {
        message,
        intentId: action.intentId,
        playerId: action.playerId,
      },
    });
  }

  protected emitIntentSuccess(
    action: TransactionIntentAction<TPayload>,
    events: readonly EconomyEvent[],
  ): void {
    for (const event of events) {
      globalEventBus.emit(
        this.attachIntentId(event, action.intentId, action.playerId),
      );
    }
  }
}
