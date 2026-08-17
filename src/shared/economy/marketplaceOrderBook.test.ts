import { describe, expect, it } from 'vitest';
import {
  buildMarketOfferTableView,
  composeMarketplaceOffers,
  parseMarketplaceOrderBookSnapshot,
  type MarketOfferRow,
} from './marketplaceOrderBook.js';

function offer(
  patch: Partial<MarketOfferRow> & Pick<MarketOfferRow, 'id' | 'itemId' | 'side'>,
): MarketOfferRow {
  return {
    displayName: 'Trader',
    quantity: 1,
    unitPriceVolts: 10,
    totalPriceVolts: 10,
    anonymous: false,
    ...patch,
  };
}

describe('marketplaceOrderBook — tabelas de oferta', () => {
  const book: readonly MarketOfferRow[] = [
    offer({ id: 's1', itemId: 'bones', side: 'sell', unitPriceVolts: 9, totalPriceVolts: 9 }),
    offer({ id: 's2', itemId: 'soul_fragment', side: 'sell', unitPriceVolts: 36, totalPriceVolts: 36 }),
    offer({ id: 'b1', itemId: 'bones', side: 'buy', unitPriceVolts: 8, totalPriceVolts: 8 }),
  ];

  it('sem item selecionado lista todas as ofertas do lado', () => {
    const sell = buildMarketOfferTableView(book, 'sell', null);
    expect(sell.rows.map((row) => row.id)).toEqual(['s1', 's2']);
    expect(sell.paddedRows.filter(Boolean)).toHaveLength(2);
  });

  it('com item selecionado filtra só aquele item', () => {
    const sell = buildMarketOfferTableView(book, 'sell', 'bones');
    expect(sell.rows).toHaveLength(1);
    expect(sell.rows[0]?.itemId).toBe('bones');
  });

  it('sem ofertas devolve uma linha vazia para a HUD', () => {
    const buy = buildMarketOfferTableView(book, 'buy', 'soul_fragment');
    expect(buy.rows).toHaveLength(0);
    expect(buy.paddedRows).toEqual([null]);
  });

  it('mantém oferta própria do item mesmo com 5 vendas mais baratas', () => {
    const crowded: MarketOfferRow[] = [
      offer({ id: 'c1', itemId: 'bones', side: 'sell', unitPriceVolts: 1, totalPriceVolts: 1 }),
      offer({ id: 'c2', itemId: 'bones', side: 'sell', unitPriceVolts: 2, totalPriceVolts: 2 }),
      offer({ id: 'c3', itemId: 'bones', side: 'sell', unitPriceVolts: 3, totalPriceVolts: 3 }),
      offer({ id: 'c4', itemId: 'bones', side: 'sell', unitPriceVolts: 4, totalPriceVolts: 4 }),
      offer({ id: 'c5', itemId: 'bones', side: 'sell', unitPriceVolts: 5, totalPriceVolts: 5 }),
      offer({
        id: 'own_sell_mk_test',
        itemId: 'bones',
        side: 'sell',
        unitPriceVolts: 99,
        totalPriceVolts: 99,
        isOwn: true,
        displayName: 'Você',
      }),
    ];
    const sell = buildMarketOfferTableView(crowded, 'sell', 'bones');
    expect(sell.rows.some((row) => row.id === 'own_sell_mk_test')).toBe(true);
    expect(sell.rows).toHaveLength(5);
  });
});

describe('composeMarketplaceOffers', () => {
  it('não descarta a oferta do viewer que está no livro global', () => {
    const offers = composeMarketplaceOffers({
      viewerPlayerId: 'p1',
      viewerCharacterId: 2,
      includeSeeds: false,
      globalListings: [{
        id: 'mk_1',
        itemId: 'bones',
        quantity: 3,
        unitPriceVolts: 12,
        totalPriceVolts: 36,
        anonymous: false,
        status: 'LISTED',
        sellerPlayerId: 'p1',
        sellerCharacterId: 2,
      }],
      ownListings: [],
      ownBuyOrders: [],
    });
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      id: 'own_sell_mk_1',
      itemId: 'bones',
      isOwn: true,
      displayName: 'Você',
    });
  });

  it('mantém oferta P2P de outro jogador mesmo sem o vendedor presente', () => {
    const offers = composeMarketplaceOffers({
      viewerPlayerId: 'p1',
      viewerCharacterId: 2,
      includeSeeds: false,
      globalListings: [{
        id: 'mk_peer',
        itemId: 'bones',
        quantity: 2,
        unitPriceVolts: 8,
        totalPriceVolts: 16,
        status: 'LISTED',
        sellerPlayerId: 'p2',
        sellerCharacterId: 1,
      }],
      ownListings: [],
      ownBuyOrders: [],
    });
    expect(offers).toHaveLength(1);
    expect(offers[0]?.id).toBe('p2p_sell_mk_peer');
    expect(offers[0]?.isOwn).toBe(false);
  });
});

describe('parseMarketplaceOrderBookSnapshot', () => {
  it('aceita snapshot com itemId e ofertas', () => {
    const parsed = parseMarketplaceOrderBookSnapshot({
      itemId: 'bones',
      offers: [
        offer({ id: 'own_sell_mk_1', itemId: 'bones', side: 'sell', isOwn: true, displayName: 'Você', anonymous: false }),
      ],
      ownListings: [{
        id: 'mk_1',
        itemId: 'bones',
        itemName: 'Ossos',
        quantity: 1,
        unitPriceVolts: 9,
        totalPriceVolts: 9,
        status: 'LISTED',
        createdAt: 1,
      }],
      ownBuyOrders: [],
    });
    expect(parsed?.itemId).toBe('bones');
    expect(parsed?.offers).toHaveLength(1);
    expect(parsed?.ownListings[0]?.id).toBe('mk_1');
  });
});
