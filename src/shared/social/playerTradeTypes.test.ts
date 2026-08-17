import { describe, expect, it } from 'vitest';
import {
  TRADE_SLOT_COUNT,
  TradePhase,
  isTradeSnapshot,
  type TradeItemOffer,
  type TradeSnapshot,
} from './playerTradeTypes.js';

function emptySlots(): (TradeItemOffer | null)[] {
  return Array.from({ length: TRADE_SLOT_COUNT }, () => null);
}

function side(playerId: string, slots: TradeSnapshot['from']['slots']): TradeSnapshot['from'] {
  return {
    playerId,
    characterId: 1,
    displayName: playerId,
    slots,
    volts: 0,
    ready: false,
  };
}

describe('isTradeSnapshot', () => {
  it('aceita oferta só com itemId do catálogo', () => {
    const slots = emptySlots();
    slots[0] = { itemId: 'bones', quantity: 2 };
    expect(isTradeSnapshot({
      tradeId: 'tr_1',
      phase: TradePhase.Open,
      from: side('a', slots),
      to: side('b', emptySlots()),
      cancelReason: null,
    })).toBe(true);
  });

  it('recusa itemId fora do catálogo — HUD não pode inventar o item', () => {
    const slots = emptySlots();
    slots[0] = { itemId: 'sword_of_hacking', quantity: 1 };
    expect(isTradeSnapshot({
      tradeId: 'tr_fake',
      phase: TradePhase.Open,
      from: side('a', slots),
      to: side('b', emptySlots()),
      cancelReason: null,
    })).toBe(false);
  });
});
