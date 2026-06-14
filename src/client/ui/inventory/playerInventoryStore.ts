import { DEMO_STARTER_INVENTORY_STACKS } from '../../../shared/demo/demoStarterInventory.js';
import { normalizeChargedInventoryStacks } from '../../../shared/items/chargedEquipment.js';
import type { InventoryStack } from '../../../shared/character/equipmentState.js';
import {
  addItemToInventorySlots,
  addItemToInventoryStacks,
  inventorySlotsToStacks,
  type AddItemToInventoryResult,
} from '../../../shared/character/inventoryStackOps.js';
import {
  buildInventorySnapshot,
  createEmptyInventorySlots,
  INVENTORY_SLOT_COUNT,
  stacksToInventorySlots,
  type InventorySnapshot,
  type InventorySlotState,
} from '../../../shared/character/inventorySlots.js';
import { eventBus, HudEvent } from '../../../shared/utils/EventBus.js';
import { getCarryCapacityStore } from '../capacity/carryCapacityStore.js';

type Listener = (snapshot: InventorySnapshot) => void;

class PlayerInventoryStore {
  private slots: InventorySlotState[] = createEmptyInventorySlots();
  private readonly listeners = new Set<Listener>();

  getSnapshot(): InventorySnapshot {
    return buildInventorySnapshot(this.slots);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setFromStacks(stacks: readonly InventoryStack[]): void {
    this.slots = stacksToInventorySlots(stacks);
    this.publish();
  }

  setFromFlatList(items: readonly { readonly id: string; readonly quantity: number }[]): void {
    this.setFromStacks(items.map((item) => ({ itemId: item.id, quantity: item.quantity })));
  }

  /** Adiciona item com stack automático; respeita CAP de peso. */
  addItem(itemId: string, quantity: number): AddItemToInventoryResult {
    const capacity = getCarryCapacityStore();
    if (!capacity.canAddItem(itemId, quantity)) {
      capacity.notifyCapacityBlocked();
      return { added: 0, overflow: quantity, slots: this.slots.map((slot) => ({ ...slot })) };
    }

    const result = addItemToInventorySlots(this.slots, itemId, quantity);
    this.slots = result.slots;
    this.publish();
    return result;
  }

  /** Substitui slots e notifica assinantes (equipar/desequipar). */
  applySlots(slots: readonly InventorySlotState[]): void {
    this.slots = slots.map((slot) => ({ ...slot }));
    this.publish();
  }

  seedDemoInventory(): void {
    this.setFromStacks(normalizeChargedInventoryStacks(DEMO_STARTER_INVENTORY_STACKS));
  }

  getSlot(index: number): InventorySlotState | null {
    if (index < 0 || index >= this.slots.length) return null;
    return this.slots[index] ?? null;
  }

  toStacks(): InventoryStack[] {
    return inventorySlotsToStacks(this.slots);
  }

  reset(): void {
    this.slots = createEmptyInventorySlots();
    this.publish();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    eventBus.publish(HudEvent.INVENTORY_UPDATED, snapshot);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

let store: PlayerInventoryStore | null = new PlayerInventoryStore();

export function getPlayerInventoryStore(): PlayerInventoryStore {
  if (!store) store = new PlayerInventoryStore();
  return store;
}

export function resetPlayerInventoryStore(): void {
  store?.reset();
  store = null;
}

export type { AddItemToInventoryResult, InventorySnapshot, InventorySlotState };
export { INVENTORY_SLOT_COUNT, addItemToInventoryStacks };
