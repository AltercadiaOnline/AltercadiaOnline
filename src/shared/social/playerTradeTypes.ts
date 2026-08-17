import { getItemById } from '../items/itemCatalog.js';

export const TRADE_REQUEST_ACTION = 'TRADE_REQUEST' as const;
export const TRADE_RESPOND_ACTION = 'TRADE_RESPOND' as const;
export const TRADE_OFFER_SET_ACTION = 'TRADE_OFFER_SET' as const;
export const TRADE_LOCK_ACTION = 'TRADE_LOCK' as const;
export const TRADE_CANCEL_ACTION = 'TRADE_CANCEL' as const;

export const TRADE_SLOT_COUNT = 4;

export const TradePhase = {
  Pending: 'pending',
  Open: 'open',
  Committing: 'committing',
  Committed: 'committed',
  Cancelled: 'cancelled',
} as const;

export type TradePhase = (typeof TradePhase)[keyof typeof TradePhase];

export type TradeCancelReason =
  | 'refused'
  | 'range'
  | 'timeout'
  | 'busy'
  | 'offline'
  | 'map'
  | 'self'
  | 'combat'
  | 'capacity'
  | 'cancelled';

export type TradeItemOffer = {
  readonly itemId: string;
  readonly quantity: number;
};

export type TradeSideSnapshot = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly slots: readonly (TradeItemOffer | null)[];
  readonly volts: number;
  readonly ready: boolean;
};

export type TradeSnapshot = {
  readonly tradeId: string;
  readonly phase: TradePhase;
  readonly from: TradeSideSnapshot;
  readonly to: TradeSideSnapshot;
  readonly cancelReason: TradeCancelReason | null;
};

export type TradeRespondPayload = {
  readonly tradeId: string;
  readonly accept: boolean;
};

export type TradeOfferSetPayload = {
  readonly tradeId: string;
  readonly slotIndex?: number;
  readonly itemId?: string | null;
  readonly quantity?: number;
  readonly volts?: number;
};

export type TradeLockPayload = {
  readonly tradeId: string;
  readonly ready: boolean;
};

export type TradeCancelPayload = {
  readonly tradeId: string;
};

export function emptyTradeSlots(): (TradeItemOffer | null)[] {
  return Array.from({ length: TRADE_SLOT_COUNT }, () => null);
}

export function flattenTradeItems(slots: readonly (TradeItemOffer | null)[]): TradeItemOffer[] {
  const merged = new Map<string, number>();
  for (const slot of slots) {
    if (!slot) continue;
    merged.set(slot.itemId, (merged.get(slot.itemId) ?? 0) + slot.quantity);
  }
  return [...merged.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function isTradeItemOffer(value: unknown): value is TradeItemOffer {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.itemId !== 'string' || row.itemId.length === 0) return false;
  if (typeof row.quantity !== 'number' || !Number.isInteger(row.quantity) || row.quantity < 1) return false;
  return getItemById(row.itemId) !== undefined;
}

export function isTradeSideSnapshot(value: unknown): value is TradeSideSnapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.playerId !== 'string' || row.playerId.length === 0) return false;
  if (typeof row.characterId !== 'number' || !Number.isInteger(row.characterId) || row.characterId < 1) {
    return false;
  }
  if (typeof row.displayName !== 'string') return false;
  if (typeof row.volts !== 'number' || !Number.isInteger(row.volts) || row.volts < 0) return false;
  if (typeof row.ready !== 'boolean') return false;
  if (!Array.isArray(row.slots) || row.slots.length !== TRADE_SLOT_COUNT) return false;
  for (const slot of row.slots) {
    if (slot !== null && !isTradeItemOffer(slot)) return false;
  }
  return true;
}

export function isTradeSnapshot(value: unknown): value is TradeSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const phase = record.phase;
  if (
    phase !== TradePhase.Pending
    && phase !== TradePhase.Open
    && phase !== TradePhase.Committing
    && phase !== TradePhase.Committed
    && phase !== TradePhase.Cancelled
  ) {
    return false;
  }
  if (typeof record.tradeId !== 'string' || record.tradeId.length === 0) return false;
  if (!isTradeSideSnapshot(record.from) || !isTradeSideSnapshot(record.to)) return false;
  if (record.cancelReason !== null && typeof record.cancelReason !== 'string') return false;
  return true;
}
