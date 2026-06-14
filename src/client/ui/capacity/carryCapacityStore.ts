import {
  calculateTotalWeight,
  canAddItemWeight,
  canEquipItemWeight,
  CAPACITY_OVERLOAD_MESSAGE,
  type CarryCapacityInput,
  type CarryCapacitySnapshot,
} from '../../../shared/character/carryCapacity.js';
import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import { eventBus, HudEvent } from '../../../shared/utils/EventBus.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';
import { alertSystem } from '../alertSystem.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

type Listener = (snapshot: CarryCapacitySnapshot) => void;

class CarryCapacityStore {
  private snapshot: CarryCapacitySnapshot = calculateTotalWeight(this.buildInput(1));
  private readonly listeners = new Set<Listener>();
  private readonly unsubscribers: Array<() => void> = [];
  private attached = false;

  attach(): void {
    if (this.attached) return;
    this.attached = true;

    this.unsubscribers.push(
      uiEvents.on(UIEventType.PLAYER_ITEMS_UPDATED, () => this.recalculate()),
      uiEvents.on(UIEventType.PLAYER_VITALS_UPDATED, () => this.recalculate()),
    );

    this.recalculate();
  }

  detach(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.attached = false;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CarryCapacitySnapshot {
    return this.snapshot;
  }

  isEncumbered(): boolean {
    return this.snapshot.isEncumbered;
  }

  /** @deprecated Use isEncumbered — movimento não é mais bloqueado, apenas desacelerado. */
  isMovementBlocked(): boolean {
    return false;
  }

  canAddItem(itemId: string, quantity: number): boolean {
    return canAddItemWeight(this.buildInput(), itemId, quantity);
  }

  canEquipItem(slotId: EquipmentUiSlotId, itemId: string): boolean {
    return canEquipItemWeight(this.buildInput(), slotId, itemId);
  }

  notifyCapacityBlocked(): void {
    alertSystem(CAPACITY_OVERLOAD_MESSAGE);
  }

  private buildInput(levelOverride?: number): CarryCapacityInput {
    const equipmentStore = getPlayerEquipmentStore();
    const itemStore = getPlayerItemStore();
    const equipmentSnapshot = equipmentStore.getSnapshot();

    return {
      inventorySlots: itemStore.getInventorySnapshot().slots,
      equipment: itemStore.toEquipmentGrid(),
      playerLevel: levelOverride ?? equipmentSnapshot.level,
    };
  }

  private recalculate(): void {
    this.snapshot = calculateTotalWeight(this.buildInput());
    eventBus.publish(HudEvent.PLAYER_STATS_UPDATED, {
      capacity: this.snapshot,
      level: this.buildInput().playerLevel,
    });
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

let store: CarryCapacityStore | null = null;

export function getCarryCapacityStore(): CarryCapacityStore {
  if (!store) {
    store = new CarryCapacityStore();
  }
  return store;
}

export function initCarryCapacityStore(): CarryCapacityStore {
  const active = getCarryCapacityStore();
  active.attach();
  return active;
}

export function resetCarryCapacityStore(): void {
  store?.detach();
  store = null;
}

export type { CarryCapacitySnapshot };
