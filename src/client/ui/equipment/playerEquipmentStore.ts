import {
  createEmptyEquipmentUiGrid,
  equipmentUiGridToEquipped,
  equippedToEquipmentUiGrid,
  EQUIPMENT_UI_SLOT_LABELS,
  UI_SLOT_TO_EQUIPMENT_SLOT,
  type EquipmentUiGridState,
  type EquipmentUiSlotId,
} from '../../../shared/character/equipmentUiSlots.js';
import type { EquippedSlots } from '../../../shared/character/equipmentState.js';
import type { ClassType } from '../../../shared/types/classes.js';
import {
  canEquipItemWeight,
  CAPACITY_OVERLOAD_MESSAGE,
} from '../../../shared/character/carryCapacity.js';
import {
  getBookDefinition,
  getEquipableItem,
  getRuneDefinition,
} from '../../../shared/items/itemCatalog.js';
import {
  isChargedEquipmentItemId,
  resolveStackDurabilityCharges,
} from '../../../shared/items/chargedEquipment.js';
import { EquipmentSlot } from '../../../shared/items/itemTypes.js';
import { alertSystem } from '../alertSystem.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { BASE_PLAYER_HP } from '../../../shared/character/playerVitals.js';

export type PlayerVitals = {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
};

export type PlayerEquipmentSnapshot = {
  readonly displayName: string;
  readonly level: number;
  readonly classId: ClassType;
  readonly vitals: PlayerVitals;
  readonly equipment: EquipmentUiGridState;
  readonly equipped: EquippedSlots;
};

type Listener = (snapshot: PlayerEquipmentSnapshot) => void;

function mpVitalsForLevel(level: number): Pick<PlayerVitals, 'mpCurrent' | 'mpMax'> {
  const mpMax = 40 + level * 8;
  return { mpCurrent: mpMax, mpMax };
}

function vitalsForLevel(level: number): PlayerVitals {
  const mp = mpVitalsForLevel(level);
  return {
    hpCurrent: BASE_PLAYER_HP,
    hpMax: BASE_PLAYER_HP,
    ...mp,
  };
}

function itemLabel(itemId: string): string {
  const equip = getEquipableItem(itemId);
  if (equip) return equip.name;
  const rune = getRuneDefinition(itemId);
  if (rune) return rune.name;
  const book = getBookDefinition(itemId);
  if (book) return book.name;
  return itemId;
}

function canPlaceInUiSlot(itemId: string, uiSlotId: EquipmentUiSlotId): boolean {
  if (uiSlotId === 'card') {
    return false;
  }

  const expected = UI_SLOT_TO_EQUIPMENT_SLOT[uiSlotId];
  if (!expected) return false;

  const equip = getEquipableItem(itemId);
  if (equip) {
    if (equip.slot === EquipmentSlot.Bottom && (uiSlotId === 'legs' || uiSlotId === 'boots')) {
      return true;
    }
    return equip.slot === expected;
  }

  if (uiSlotId === 'runes') return Boolean(getRuneDefinition(itemId));
  if (uiSlotId === 'books') return Boolean(getBookDefinition(itemId));

  return false;
}

/**
 * Espelho local do SET — emite eventos; futuro: sincronizar via economyGateway no servidor.
 */
export class PlayerEquipmentStore {
  private displayName = 'Operative';
  private level = 1;
  private classId: ClassType = 'IMPETUS';
  private vitals: PlayerVitals = vitalsForLevel(1);
  private slots: EquipmentUiGridState = createEmptyEquipmentUiGrid();
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PlayerEquipmentSnapshot {
    return {
      displayName: this.displayName,
      level: this.level,
      classId: this.classId,
      vitals: { ...this.vitals },
      equipment: { ...this.slots },
      equipped: equipmentUiGridToEquipped(this.slots),
    };
  }

  setPlayerInfo(
    name: string,
    level: number,
    options?: { readonly resetVitals?: boolean; readonly classId?: ClassType },
  ): void {
    this.displayName = name;
    if (options?.classId) {
      this.classId = options.classId;
    }
    const nextLevel = Math.max(1, Math.floor(level));
    const levelChanged = nextLevel !== this.level;
    this.level = nextLevel;

    if (options?.resetVitals) {
      this.vitals = vitalsForLevel(this.level);
    } else if (levelChanged) {
      const nextMp = mpVitalsForLevel(this.level);
      this.vitals = {
        ...this.vitals,
        mpMax: nextMp.mpMax,
        mpCurrent: Math.min(this.vitals.mpCurrent, nextMp.mpMax),
      };
    }

    this.publish();
  }

  setVitals(vitals: Partial<PlayerVitals>): void {
    this.vitals = { ...this.vitals, ...vitals };
    this.publish();
  }

  loadEquipped(equipped: EquippedSlots): void {
    this.slots = equippedToEquipmentUiGrid(equipped);
    this.publish();
  }

  /** Hidrata grade visual sem colapsar slots duplicados (anel E/D, pernas/botas). */
  loadUiGrid(grid: EquipmentUiGridState): void {
    this.slots = { ...grid };
    this.publish();
  }

  /** @deprecated MVP — todos os itens iniciam na mochila; use bootstrapMvpPlayerItems(). */
  seedDemoLoadout(): void {
    this.slots = createEmptyEquipmentUiGrid();
    this.publish();
  }

  equipItem(uiSlotId: EquipmentUiSlotId, itemId: string): boolean {
    if (!canPlaceInUiSlot(itemId, uiSlotId)) return false;

    const snapshot = this.getSnapshot();
    const itemStore = getPlayerItemStore();
    const canEquip = canEquipItemWeight(
      {
        inventorySlots: itemStore.getInventorySnapshot().slots,
        equipment: itemStore.toEquipmentGrid(),
        playerLevel: snapshot.level,
      },
      uiSlotId,
      itemId,
    );
    if (!canEquip) {
      alertSystem(CAPACITY_OVERLOAD_MESSAGE);
      return false;
    }

    this.slots[uiSlotId] = itemId;
    this.publish();
    return true;
  }

  unequipItem(uiSlotId: EquipmentUiSlotId): string | null {
    const itemId = this.slots[uiSlotId];
    if (!itemId) return null;
    this.slots[uiSlotId] = null;
    this.publish();
    return itemId;
  }

  /** Desequipa runa/livro quando o stack some ou fica sem cargas. */
  syncChargedEquipmentWithInventory(): void {
    const inventory = getPlayerItemStore().getInventorySnapshot().slots;
    let changed = false;

    for (const uiSlotId of ['runes', 'books'] as const) {
      const itemId = this.slots[uiSlotId];
      if (!itemId || !isChargedEquipmentItemId(itemId)) continue;

      const row = inventory.find((slot) => slot.itemId === itemId);
      const charges = row
        ? resolveStackDurabilityCharges({
            itemId,
            quantity: row.quantity,
            ...(row.charges !== undefined ? { charges: row.charges } : {}),
          })
        : 0;

      if (!row || charges <= 0) {
        this.slots[uiSlotId] = null;
        changed = true;
      }
    }

    if (changed) {
      this.publish();
    }
  }

  getSlotLabel(uiSlotId: EquipmentUiSlotId): string {
    return EQUIPMENT_UI_SLOT_LABELS[uiSlotId];
  }

  getItemDisplayName(itemId: string): string {
    return itemLabel(itemId);
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    uiEvents.emit(UIEventType.EQUIPMENT_UPDATED, {
      equipment: snapshot.equipment,
      equipped: snapshot.equipped,
    });
    uiEvents.emit(UIEventType.PLAYER_VITALS_UPDATED, { vitals: snapshot.vitals });
  }
}

let activeStore: PlayerEquipmentStore | null = null;

export function getPlayerEquipmentStore(): PlayerEquipmentStore {
  if (!activeStore) {
    activeStore = new PlayerEquipmentStore();
  }
  return activeStore;
}

export function resetPlayerEquipmentStore(): void {
  activeStore = null;
}
