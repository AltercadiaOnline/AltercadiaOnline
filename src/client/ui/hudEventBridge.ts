import { eventBus, HudEvent } from '../../shared/utils/EventBus.js';
import { uiEvents, UIEventType } from './uiEvents.js';

let bridgeActive = false;
const bridgeUnsubscribers: Array<() => void> = [];

/**
 * Espelha eventos do EventBus centralizado no barramento legado `uiEvents`,
 * preservando compatibilidade com painéis ainda não migrados.
 */
export function initHudEventBridge(): void {
  if (bridgeActive) return;
  bridgeActive = true;

  bridgeUnsubscribers.push(
    eventBus.subscribe(HudEvent.BALANCE_CHANGED, (payload) => {
      uiEvents.emit(UIEventType.UPDATE_GOLD, {
        amount: payload.dollarVolt,
        formatted: payload.voltsFormatted,
      });
      uiEvents.emit(UIEventType.UPDATE_ALTER_COINS, {
        amount: payload.alterCoins,
        formatted: payload.alterFormatted,
      });
      uiEvents.emit(UIEventType.CURRENCY_UPDATED, {
        dollarVolt: payload.dollarVolt,
        alterCoins: payload.alterCoins,
        formatted: payload.voltsFormatted,
        deltaVolts: payload.deltaVolts,
        deltaAlter: payload.deltaAlter,
      });
    }),
    eventBus.subscribe(HudEvent.INVENTORY_UPDATED, (payload) => {
      uiEvents.emit(UIEventType.INVENTORY_UPDATED, payload);
    }),
    eventBus.subscribe(HudEvent.SKIN_CHANGED, (payload) => {
      uiEvents.emit(UIEventType.PLAYER_SKIN_UPDATED, payload);
    }),
    eventBus.subscribe(HudEvent.PLAYER_STATS_UPDATED, (payload) => {
      if (payload.statsBonus && payload.speedBonusTotal !== undefined) {
        uiEvents.emit(UIEventType.PLAYER_STATS_UPDATED, {
          statsBonus: payload.statsBonus,
          speedBonusTotal: payload.speedBonusTotal,
        });
      }
      if (payload.capacity) {
        uiEvents.emit(UIEventType.CAPACITY_UPDATED, payload.capacity);
      }
    }),
  );
}

export function destroyHudEventBridge(): void {
  for (const off of bridgeUnsubscribers) off();
  bridgeUnsubscribers.length = 0;
  bridgeActive = false;
}
