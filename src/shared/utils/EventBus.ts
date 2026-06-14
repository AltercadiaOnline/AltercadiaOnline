import type { CarryCapacitySnapshot } from '../character/carryCapacity.js';
import type { InventorySnapshot } from '../character/inventorySlots.js';
import type { PlayerSkin, SkinSlotId } from '../character/playerSkin.js';
import type { PlayerStatsBonus } from '../character/playerStatsBonus.js';
import type { BalanceChangedPayload } from '../economy/events.js';

/** Eventos globais da HUD — barramento desacoplado entre painéis. */
export const HudEvent = {
  BALANCE_CHANGED: 'BALANCE_CHANGED',
  CURRENCY_UPDATED: 'CURRENCY_UPDATED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  SKIN_CHANGED: 'SKIN_CHANGED',
  PLAYER_STATS_UPDATED: 'PLAYER_STATS_UPDATED',
} as const;

export type HudEventType = (typeof HudEvent)[keyof typeof HudEvent];

export type CurrencyUpdatedPayload = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly formatted: string;
  readonly deltaVolts?: number;
  readonly deltaAlter?: number;
};

export type SkinChangedPayload = {
  readonly skin: PlayerSkin;
  readonly ownedSkins?: Record<SkinSlotId, readonly string[]>;
};

export type PlayerStatsUpdatedPayload = {
  readonly statsBonus?: PlayerStatsBonus;
  readonly speedBonusTotal?: number;
  readonly level?: number;
  readonly capacity?: CarryCapacitySnapshot;
};

export type HudEventMap = {
  readonly BALANCE_CHANGED: BalanceChangedPayload;
  readonly CURRENCY_UPDATED: CurrencyUpdatedPayload;
  readonly INVENTORY_UPDATED: InventorySnapshot;
  readonly SKIN_CHANGED: SkinChangedPayload;
  readonly PLAYER_STATS_UPDATED: PlayerStatsUpdatedPayload;
};

export type HudEventHandler<T extends HudEventType> = (payload: HudEventMap[T]) => void;

type Handler = (payload: HudEventMap[HudEventType]) => void;

/**
 * Barramento tipado publish/subscribe para comunicação desacoplada da HUD.
 */
export class EventBus<TMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof TMap, Set<Handler>>();

  subscribe<K extends keyof TMap & string>(
    event: K,
    handler: (payload: TMap[K]) => void,
  ): () => void {
    const bucket = this.listeners.get(event) ?? new Set<Handler>();
    bucket.add(handler as Handler);
    this.listeners.set(event, bucket);
    return () => {
      this.unsubscribe(event, handler);
    };
  }

  publish<K extends keyof TMap & string>(event: K, payload: TMap[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const handler of bucket) {
      (handler as (payload: TMap[K]) => void)(payload);
    }
  }

  unsubscribe<K extends keyof TMap & string>(
    event: K,
    handler: (payload: TMap[K]) => void,
  ): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  clear(): void {
    this.listeners.clear();
  }
}

/** Instância global — ponto único de integração entre componentes HUD. */
export const eventBus = new EventBus<HudEventMap>();
