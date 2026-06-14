import { getItemById } from '../../../shared/items/itemCatalog.js';

export type PlayerMarketListingStatus = 'LISTED' | 'SOLD';

export type PlayerMarketListing = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly status: PlayerMarketListingStatus;
  readonly anonymous?: boolean;
  readonly createdAt: number;
  readonly soldAt?: number;
};

type MarketListener = (listings: readonly PlayerMarketListing[]) => void;

const STORAGE_KEY = 'altercadia.market.listings.v1';

function buildListingId(): string {
  return `mk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneListings(listings: readonly PlayerMarketListing[]): PlayerMarketListing[] {
  return listings.map((entry) => ({ ...entry }));
}

class PlayerMarketStore {
  private listings: PlayerMarketListing[] = [];
  private readonly listeners = new Set<MarketListener>();
  private sellTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.listings = this.loadFromStorage();
    for (const listing of this.listings) {
      if (listing.status === 'LISTED') this.scheduleAutoSell(listing.id);
    }
  }

  subscribe(listener: MarketListener): () => void {
    this.listeners.add(listener);
    listener(this.getListings());
    return () => this.listeners.delete(listener);
  }

  getListings(): readonly PlayerMarketListing[] {
    return cloneListings(this.listings)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  addListing(
    itemId: string,
    quantity: number,
    unitPriceVolts: number,
    anonymous = false,
  ): PlayerMarketListing {
    const item = getItemById(itemId);
    const listing: PlayerMarketListing = {
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
    this.listings = [listing, ...this.listings];
    this.scheduleAutoSell(listing.id);
    this.persistAndPublish();
    return { ...listing };
  }

  collectSoldListing(listingId: string): { ok: true; volts: number } | { ok: false; reason: string } {
    const target = this.listings.find((entry) => entry.id === listingId);
    if (!target) return { ok: false, reason: 'Anúncio não encontrado.' };
    if (target.status !== 'SOLD') return { ok: false, reason: 'Este anúncio ainda está à venda.' };

    const volts = target.totalPriceVolts;
    this.listings = this.listings.filter((entry) => entry.id !== listingId);
    const timer = this.sellTimers.get(listingId);
    if (timer) clearTimeout(timer);
    this.sellTimers.delete(listingId);
    this.persistAndPublish();
    return { ok: true, volts };
  }

  cancelListing(
    listingId: string,
  ): { ok: true; itemId: string; quantity: number; itemName: string }
    | { ok: false; reason: string } {
    const target = this.listings.find((entry) => entry.id === listingId);
    if (!target) return { ok: false, reason: 'Anúncio não encontrado.' };
    if (target.status !== 'LISTED') {
      return { ok: false, reason: 'Este anúncio não pode ser cancelado.' };
    }

    this.listings = this.listings.filter((entry) => entry.id !== listingId);
    const timer = this.sellTimers.get(listingId);
    if (timer) clearTimeout(timer);
    this.sellTimers.delete(listingId);
    this.persistAndPublish();
    return {
      ok: true,
      itemId: target.itemId,
      quantity: target.quantity,
      itemName: target.itemName,
    };
  }

  reset(): void {
    for (const timer of this.sellTimers.values()) clearTimeout(timer);
    this.sellTimers.clear();
    this.listings = [];
    this.persistAndPublish();
  }

  private scheduleAutoSell(listingId: string): void {
    if (this.sellTimers.has(listingId)) return;
    const timer = setTimeout(() => {
      this.sellTimers.delete(listingId);
      this.markAsSold(listingId);
    }, 45000);
    this.sellTimers.set(listingId, timer);
  }

  private markAsSold(listingId: string): void {
    let changed = false;
    this.listings = this.listings.map((entry) => {
      if (entry.id !== listingId || entry.status === 'SOLD') return entry;
      changed = true;
      return { ...entry, status: 'SOLD', soldAt: Date.now() };
    });
    if (changed) this.persistAndPublish();
  }

  private persistAndPublish(): void {
    this.saveToStorage();
    const snapshot = this.getListings();
    for (const listener of this.listeners) listener(snapshot);
  }

  private loadFromStorage(): PlayerMarketListing[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PlayerMarketListing[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => (
        typeof entry.id === 'string'
        && typeof entry.itemId === 'string'
        && typeof entry.itemName === 'string'
        && typeof entry.quantity === 'number'
        && typeof entry.unitPriceVolts === 'number'
        && typeof entry.totalPriceVolts === 'number'
        && (entry.status === 'LISTED' || entry.status === 'SOLD')
      ));
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.listings));
    } catch {
      /* ignore quota issues */
    }
  }
}

let store: PlayerMarketStore | null = null;

export function getPlayerMarketStore(): PlayerMarketStore {
  if (!store) store = new PlayerMarketStore();
  return store;
}

export function resetPlayerMarketStore(): void {
  store?.reset();
  store = null;
}
