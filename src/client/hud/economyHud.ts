import type { EconomyEvent } from '../../shared/economy/events.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { BANK_TRANSACTION_SUCCESS_MESSAGE } from '../../shared/bank/bankConstants.js';
import { buildBankStorageView } from '../../shared/bank/bankService.js';
import { formatAlterCoins, formatVolts } from '../../shared/economy/premiumCurrency.js';
import { alertSystem } from '../ui/alertSystem.js';
import { postSystemNotification } from '../ui/logService.js';
import { stacksToInventorySlots } from '../../shared/character/inventorySlots.js';
import { completeBankTransactionSuccess } from '../economy/bankTransactionClient.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { scheduleInventoryUpdatedPayload } from '../game/PlayerItemSession.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';

export function formatDollarVolt(amount: number): string {
  return formatVolts(amount);
}

export function applyEconomyEventToHud(event: EconomyEvent): void {
  const dataStore = getMutableDataStore();
  const dispatcher = getActionDispatcher();

  if (event.type === EconomyEventType.TransactionSuccess) {
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    return;
  }

  if (event.type === EconomyEventType.TransactionFailed) {
    const intentId = event.payload.intentId;
    if (intentId && getPendingIntentRegistry().isIntentPending(intentId)) {
      dispatcher.rejectIntent(intentId);
      uiEvents.emit(UIEventType.BANK_TRANSACTION_FAILED, {
        message: event.payload.message,
      });
      alertSystem(event.payload.message);
    }
    return;
  }

  if (event.type === EconomyEventType.WalletUpdated) {
    dataStore.applyWalletFromServer(
      {
        dollarVolt: event.payload.dollarVolt,
        alterCoins: event.payload.alterCoins,
        voltsFormatted: formatVolts(event.payload.dollarVolt),
        alterFormatted: formatAlterCoins(event.payload.alterCoins),
      },
      event.payload.revision,
    );
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    return;
  }

  if (event.type === EconomyEventType.AlterExchangeCompleted) {
    dataStore.applyWalletFromServer(
      {
        dollarVolt: event.payload.dollarVolt,
        alterCoins: event.payload.alterCoins,
        voltsFormatted: formatVolts(event.payload.dollarVolt),
        alterFormatted: formatAlterCoins(event.payload.alterCoins),
      },
      event.payload.revision,
    );
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    return;
  }

  if (event.type === EconomyEventType.LootGranted) {
    const items = event.payload.itemIds.length;
    const msg = items > 0
      ? `Saque coletado: +${formatVolts(event.payload.dollarVolt)} VOLTS, ${items} item(ns).`
      : `Saque coletado: +${formatVolts(event.payload.dollarVolt)} VOLTS.`;
    postSystemNotification(msg, 'high');
    return;
  }

  if (event.type === EconomyEventType.InventoryUpdated) {
    scheduleInventoryUpdatedPayload(event.payload);
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    return;
  }

  if (event.type === EconomyEventType.PetRosterUpdated) {
    getPlayerPetStore().applyPetRosterFromServer({
      pets: event.payload.pets.map((pet) => ({ ...pet })),
      activeSlotIndex: event.payload.activeSlotIndex,
      selectedSlotIndex: event.payload.selectedSlotIndex,
    });
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    if (event.payload.message) {
      alertSystem(event.payload.message);
    }
    return;
  }

  if (event.type === EconomyEventType.PetAffinityUpdated) {
    getPlayerPetStore().applyPetAffinityFromServer({
      rationCharges: event.payload.rationCharges,
      lastPetRationFeedAtMs: event.payload.lastPetRationFeedAtMs,
      lastPetAffectionAtMs: event.payload.lastPetAffectionAtMs,
    });
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    if (event.payload.message) {
      alertSystem(event.payload.message);
    }
    return;
  }

  if (event.type === EconomyEventType.WorldVitalsUpdated) {
    getGlobalPlayerStore().applyWorldVitals(event.payload.vitals);
    getPlayerEquipmentStore().setVitals({
      hpCurrent: event.payload.vitals.hpCurrent,
      hpMax: event.payload.vitals.hpMax,
      mpCurrent: event.payload.vitals.mpCurrent,
      mpMax: event.payload.vitals.mpMax,
    });
    if (event.payload.intentId) {
      dispatcher.confirmIntent(event.payload.intentId);
    }
    alertSystem(event.payload.message);
    return;
  }

  if (event.type === EconomyEventType.UpdateBankSuccess) {
    const slots = stacksToInventorySlots(
      event.payload.inventory.map((row) => ({
        itemId: row.itemId,
        quantity: row.quantity,
        ...(row.lockedQuantity !== undefined ? { lockedQuantity: row.lockedQuantity } : {}),
      })),
    );
    dataStore.applyWalletFromServer(
      {
        dollarVolt: event.payload.dollarVolt,
        alterCoins: event.payload.alterCoins,
        voltsFormatted: formatVolts(event.payload.dollarVolt),
        alterFormatted: formatAlterCoins(event.payload.alterCoins),
      },
      event.payload.revision,
    );
    dataStore.applyInventoryFromServer(
      {
        slots,
        capacity: slots.length,
        used: slots.filter((s) => s.itemId).length,
      },
      event.payload.revision,
    );
    const bankView = buildBankStorageView(
      event.payload.bankItemStacks,
      event.payload.bankCurrencies,
    );
    dataStore.applyBankStorageFromServer(bankView, event.payload.revision);
    completeBankTransactionSuccess(event.payload.intentId);
    const message = event.payload.message || BANK_TRANSACTION_SUCCESS_MESSAGE;
    uiEvents.emit(UIEventType.BANK_STORAGE_UPDATED, {
      revision: dataStore.getRevision('bankStorage'),
    });
    uiEvents.emit(UIEventType.BANK_BALANCE_UPDATED, {
      dollarVolt: bankView.currencies.dollarVolt,
      alterCoins: bankView.currencies.alterCoins,
      voltsFormatted: bankView.voltsFormatted,
      alterFormatted: bankView.alterFormatted,
      ...(event.payload.revision !== undefined ? { revision: event.payload.revision } : {}),
    });
    uiEvents.emit(UIEventType.BANK_UPDATE_SUCCESS, { message });
    uiEvents.emit(UIEventType.BANK_TRANSACTION_SUCCESS, { message });
    alertSystem(message);
  }
}

export function isEconomyEvent(value: unknown): value is EconomyEvent {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== 'string') return false;
  return Object.values(EconomyEventType).includes(record.type as EconomyEvent['type']);
}

/** Emite eventos de UI a partir do espelho local (exploração offline). */
export function publishLocalWalletToHud(): void {
  // Deprecated — PlayerWalletStore.onBalanceChanged alimenta a HUD diretamente.
}

export { formatAlterCoins, formatVolts };
