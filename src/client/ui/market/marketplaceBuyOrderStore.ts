import { getItemById } from '../../../shared/items/itemCatalog.js';

export type MarketplaceBuyOrder = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous: boolean;
  readonly createdAt: number;
};

type BuyOrderListener = (orders: readonly MarketplaceBuyOrder[]) => void;

const STORAGE_KEY = 'altercadia.market.buyOrders.v1';

function buildOrderId(): string {
  return `mb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class MarketplaceBuyOrderStore {
  private orders: MarketplaceBuyOrder[] = [];
  private readonly listeners = new Set<BuyOrderListener>();

  constructor() {
    this.orders = this.loadFromStorage();
  }

  subscribe(listener: BuyOrderListener): () => void {
    this.listeners.add(listener);
    listener(this.getOrders());
    return () => this.listeners.delete(listener);
  }

  getOrders(): readonly MarketplaceBuyOrder[] {
    return this.orders.map((order) => ({ ...order }));
  }

  addOrder(
    itemId: string,
    quantity: number,
    unitPriceVolts: number,
    anonymous: boolean,
  ): MarketplaceBuyOrder {
    const item = getItemById(itemId);
    const qty = Math.max(1, Math.floor(quantity));
    const unit = Math.max(1, Math.floor(unitPriceVolts));
    const order: MarketplaceBuyOrder = {
      id: buildOrderId(),
      itemId,
      itemName: item?.name ?? itemId,
      quantity: qty,
      unitPriceVolts: unit,
      totalPriceVolts: qty * unit,
      anonymous,
      createdAt: Date.now(),
    };
    this.orders = [order, ...this.orders];
    this.persistAndPublish();
    return { ...order };
  }

  cancelOrder(
    orderId: string,
  ): { ok: true; refundVolts: number; itemName: string } | { ok: false; reason: string } {
    const target = this.orders.find((entry) => entry.id === orderId);
    if (!target) return { ok: false, reason: 'Ordem de compra não encontrada.' };

    this.orders = this.orders.filter((entry) => entry.id !== orderId);
    this.persistAndPublish();
    return {
      ok: true,
      refundVolts: target.totalPriceVolts,
      itemName: target.itemName,
    };
  }

  reset(): void {
    this.orders = [];
    this.persistAndPublish();
  }

  /** Espelha ordens autoritativas do servidor (modo online). */
  replaceFromServer(orders: readonly MarketplaceBuyOrder[]): void {
    this.orders = orders.map((entry) => ({ ...entry }));
    this.persistAndPublish();
  }

  private persistAndPublish(): void {
    this.saveToStorage();
    const snapshot = this.getOrders();
    for (const listener of this.listeners) listener(snapshot);
  }

  private loadFromStorage(): MarketplaceBuyOrder[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MarketplaceBuyOrder[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => (
        typeof entry.id === 'string'
        && typeof entry.itemId === 'string'
        && typeof entry.quantity === 'number'
        && typeof entry.unitPriceVolts === 'number'
      ));
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders));
    } catch {
      /* ignore */
    }
  }
}

let store: MarketplaceBuyOrderStore | null = null;

export function getMarketplaceBuyOrderStore(): MarketplaceBuyOrderStore {
  if (!store) store = new MarketplaceBuyOrderStore();
  return store;
}

export function resetMarketplaceBuyOrderStore(): void {
  store?.reset();
  store = null;
}
