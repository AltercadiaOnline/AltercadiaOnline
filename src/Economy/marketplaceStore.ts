import { getItemById } from '../shared/items/itemCatalog.js';

export type MarketplaceListingStatus = 'LISTED' | 'SOLD';

export type MarketplaceListingRecord = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly status: MarketplaceListingStatus;
  readonly anonymous?: boolean;
  readonly createdAt: number;
  readonly soldAt?: number;
};

export type MarketplaceBuyOrderRecord = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous: boolean;
  readonly createdAt: number;
};

type CharacterMarketState = {
  listings: MarketplaceListingRecord[];
  buyOrders: MarketplaceBuyOrderRecord[];
};

export type MarketplacePersistenceSlice = {
  readonly listings: readonly MarketplaceListingRecord[];
  readonly buyOrders: readonly MarketplaceBuyOrderRecord[];
};

const AUTO_SELL_DELAY_MS = 45_000;

const marketByCharacter = new Map<string, CharacterMarketState>();
const sellTimers = new Map<string, ReturnType<typeof setTimeout>>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function buildListingId(): string {
  return `mk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildOrderId(): string {
  return `mb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneListing(entry: MarketplaceListingRecord): MarketplaceListingRecord {
  return { ...entry };
}

function cloneOrder(entry: MarketplaceBuyOrderRecord): MarketplaceBuyOrderRecord {
  return { ...entry };
}

function getState(playerId: string, characterId: number): CharacterMarketState {
  const key = profileKey(playerId, characterId);
  const existing = marketByCharacter.get(key);
  if (existing) return existing;
  const created: CharacterMarketState = { listings: [], buyOrders: [] };
  marketByCharacter.set(key, created);
  return created;
}

function scheduleAutoSell(
  playerId: string,
  characterId: number,
  listingId: string,
  onSold: (listingId: string) => void,
): void {
  const timerKey = `${profileKey(playerId, characterId)}:${listingId}`;
  if (sellTimers.has(timerKey)) return;

  const timer = setTimeout(() => {
    sellTimers.delete(timerKey);
    onSold(listingId);
  }, AUTO_SELL_DELAY_MS);

  sellTimers.set(timerKey, timer);
}

export function getMarketplaceListings(
  playerId: string,
  characterId: number,
): readonly MarketplaceListingRecord[] {
  return getState(playerId, characterId).listings.map(cloneListing);
}

export function getMarketplaceBuyOrders(
  playerId: string,
  characterId: number,
): readonly MarketplaceBuyOrderRecord[] {
  return getState(playerId, characterId).buyOrders.map(cloneOrder);
}

export function addMarketplaceListing(
  playerId: string,
  characterId: number,
  itemId: string,
  quantity: number,
  unitPriceVolts: number,
  anonymous: boolean,
  onAutoSold?: (listingId: string) => void,
): MarketplaceListingRecord {
  const item = getItemById(itemId);
  const listing: MarketplaceListingRecord = {
    id: buildListingId(),
    itemId,
    itemName: item?.name ?? itemId,
    quantity,
    unitPriceVolts,
    totalPriceVolts: quantity * unitPriceVolts,
    status: 'LISTED',
    anonymous,
    createdAt: Date.now(),
  };

  const state = getState(playerId, characterId);
  state.listings = [listing, ...state.listings];

  if (onAutoSold) {
    scheduleAutoSell(playerId, characterId, listing.id, onAutoSold);
  }

  return cloneListing(listing);
}

export function markMarketplaceListingSold(
  playerId: string,
  characterId: number,
  listingId: string,
): MarketplaceListingRecord | null {
  const state = getState(playerId, characterId);
  let sold: MarketplaceListingRecord | null = null;

  state.listings = state.listings.map((entry) => {
    if (entry.id !== listingId || entry.status === 'SOLD') return entry;
    sold = { ...entry, status: 'SOLD', soldAt: Date.now() };
    return sold;
  });

  return sold ? cloneListing(sold) : null;
}

export function collectMarketplaceListing(
  playerId: string,
  characterId: number,
  listingId: string,
): { readonly ok: true; readonly volts: number } | { readonly ok: false; readonly reason: string } {
  const state = getState(playerId, characterId);
  const target = state.listings.find((entry) => entry.id === listingId);
  if (!target) return { ok: false, reason: 'Anúncio não encontrado.' };
  if (target.status !== 'SOLD') return { ok: false, reason: 'Este anúncio ainda está à venda.' };

  const volts = target.totalPriceVolts;
  state.listings = state.listings.filter((entry) => entry.id !== listingId);
  return { ok: true, volts };
}

export function cancelMarketplaceListing(
  playerId: string,
  characterId: number,
  listingId: string,
): { readonly ok: true; readonly itemId: string; readonly quantity: number; readonly itemName: string }
  | { readonly ok: false; readonly reason: string } {
  const state = getState(playerId, characterId);
  const target = state.listings.find((entry) => entry.id === listingId);
  if (!target) return { ok: false, reason: 'Anúncio não encontrado ou já encerrado.' };
  if (target.status !== 'LISTED') {
    return { ok: false, reason: 'Este anúncio não pode ser cancelado.' };
  }

  state.listings = state.listings.filter((entry) => entry.id !== listingId);
  const timerKey = `${profileKey(playerId, characterId)}:${listingId}`;
  const timer = sellTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    sellTimers.delete(timerKey);
  }

  return {
    ok: true,
    itemId: target.itemId,
    quantity: target.quantity,
    itemName: target.itemName,
  };
}

export function addMarketplaceBuyOrder(
  playerId: string,
  characterId: number,
  itemId: string,
  quantity: number,
  unitPriceVolts: number,
  anonymous: boolean,
): MarketplaceBuyOrderRecord {
  const item = getItemById(itemId);
  const qty = Math.max(1, Math.floor(quantity));
  const unit = Math.max(1, Math.floor(unitPriceVolts));
  const order: MarketplaceBuyOrderRecord = {
    id: buildOrderId(),
    itemId,
    itemName: item?.name ?? itemId,
    quantity: qty,
    unitPriceVolts: unit,
    totalPriceVolts: qty * unit,
    anonymous,
    createdAt: Date.now(),
  };

  const state = getState(playerId, characterId);
  state.buyOrders = [order, ...state.buyOrders];
  return cloneOrder(order);
}

export function cancelMarketplaceBuyOrder(
  playerId: string,
  characterId: number,
  orderId: string,
): { readonly ok: true; readonly refundVolts: number; readonly itemName: string }
  | { readonly ok: false; readonly reason: string } {
  const state = getState(playerId, characterId);
  const target = state.buyOrders.find((entry) => entry.id === orderId);
  if (!target) return { ok: false, reason: 'Ordem de compra não encontrada.' };

  state.buyOrders = state.buyOrders.filter((entry) => entry.id !== orderId);
  return {
    ok: true,
    refundVolts: target.totalPriceVolts,
    itemName: target.itemName,
  };
}

export function resetMarketplaceStore(): void {
  for (const timer of sellTimers.values()) clearTimeout(timer);
  sellTimers.clear();
  marketByCharacter.clear();
}

export function exportMarketplacePersistence(
  playerId: string,
  characterId: number,
): MarketplacePersistenceSlice {
  const state = getState(playerId, characterId);
  return {
    listings: state.listings.map(cloneListing),
    buyOrders: state.buyOrders.map(cloneOrder),
  };
}

export function hydrateMarketplacePersistence(
  playerId: string,
  characterId: number,
  slice: MarketplacePersistenceSlice,
): void {
  const key = profileKey(playerId, characterId);
  marketByCharacter.set(key, {
    listings: slice.listings.map(cloneListing),
    buyOrders: slice.buyOrders.map(cloneOrder),
  });
}
