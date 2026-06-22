import type { PlayerItemRecord } from '../../../shared/character/itemSlotModel.js';

import {

  assignEquipmentSlotToInventory,

  assignItemToEquipmentSlot,

  buildItemRecordsFromServerBundle,

  coalescePlayerItemRecords,

  equipmentGridFromItems,

  equippedSlotsFromItems,

  filterEquippedItems,

  filterInventoryItems,

  inventorySlotsFromItems,

  inventoryStacksFromItems,

  ItemLocationSlot,

} from '../../../shared/character/itemSlotModel.js';

import type { InventoryStack, EquippedSlots } from '../../../shared/character/equipmentState.js';

import type { EquipmentUiGridState, EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';

import { EquipmentUiSlotId as UiSlot } from '../../../shared/character/equipmentUiSlots.js';

import { buildInventorySnapshot, type InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { computeInventoryChecksumFromStacks } from '../../../shared/character/inventoryChecksum.js';

import {

  isChargedEquipmentItemId,

  resolveStackDurabilityCharges,

} from '../../../shared/items/chargedEquipment.js';

import { uiEvents, UIEventType } from '../uiEvents.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';
import { ItemStateValidator } from './itemStateValidator.js';
import { cancelScheduledFrame, scheduleNextFrame } from '../../sync/frameScheduler.js';



export type PlayerItemSnapshot = {

  readonly revision: number;

  readonly items: readonly PlayerItemRecord[];

};



type Listener = (snapshot: PlayerItemSnapshot) => void;

export type ServerHydrateOptions = {
  /** Sync imediato — login/full-state; padrão batched por frame. */
  readonly immediate?: boolean;
};



/**

 * Fonte única cliente — cada item tem `slot` ('inventory' ou slot do SET).

 * Inventário e barra lateral filtram este array; não há move/clone entre stores.

 * Não altera posição do jogador — movimento é SSOT via MovementService / PlayerDataStore.

 */

class PlayerItemStore {

  private items: PlayerItemRecord[] = [];

  private revision = 0;

  private readonly listeners = new Set<Listener>();

  private pendingServerRecords: PlayerItemRecord[] | null = null;

  private serverHydrateFrame: number | null = null;

  private lastServerInventoryChecksum: string | null = null;



  /** Estado canônico — um item, um lugar; sempre persiste após coalesce. */
  private normalizedItems(): PlayerItemRecord[] {
    this.items = coalescePlayerItemRecords(this.items);
    return this.items;
  }



  private commitNormalized(items: readonly PlayerItemRecord[]): void {

    this.items = coalescePlayerItemRecords(items);

    this.revision += 1;

    this.publish();

  }



  getSnapshot(): PlayerItemSnapshot {

    const items = this.normalizedItems();

    return { revision: this.revision, items: items.map((row) => ({ ...row })) };

  }



  getItems(): readonly PlayerItemRecord[] {

    return this.normalizedItems();

  }



  subscribe(listener: Listener): () => void {

    this.listeners.add(listener);

    listener(this.getSnapshot());

    return () => this.listeners.delete(listener);

  }



  /** Substitui todo o array — sync servidor força redesenho da UI. */

  replaceAll(items: readonly PlayerItemRecord[]): void {

    this.commitNormalized(items);

  }



  assignItemSlot(itemId: string, targetSlot: EquipmentUiSlotId): ReturnType<typeof assignItemToEquipmentSlot> {

    const result = assignItemToEquipmentSlot(this.normalizedItems(), itemId, targetSlot);

    if (result.ok) {

      this.commitNormalized(result.items);

    }

    return result;

  }



  equipItemById(itemId: string, preferredUiSlot?: EquipmentUiSlotId): ReturnType<typeof assignItemToEquipmentSlot> {
    const result = assignItemToEquipmentSlot(this.normalizedItems(), itemId, preferredUiSlot);
    if (result.ok) {
      this.commitNormalized(result.items);
    }
    return result;
  }



  /**
   * Equipa: o registro deixa de ser `inventory` e passa a usar o slot do SET.
   * Um item, um lugar — inventário e sidebar leem o mesmo array filtrando por `slot`.
   * (qty>1 divide stack; slot ocupado faz swap — ver assignItemToEquipmentSlot.)
   */
  equipItem(
    itemId: string,
    targetSlot?: EquipmentUiSlotId | string,
  ): ReturnType<typeof assignItemToEquipmentSlot> | { readonly ok: false; readonly reason: 'invalid_slot' | 'not_found' } {
    if (!this.getItemById(itemId)) {
      return { ok: false, reason: 'not_found' };
    }

    if (targetSlot === undefined) {
      const result = assignItemToEquipmentSlot(this.normalizedItems(), itemId);
      if (result.ok) {
        this.commitNormalized(result.items);
      }
      return result;
    }

    if (typeof targetSlot === 'string' && !isEquipmentUiSlotId(targetSlot)) {
      return this.updateItemSlot(itemId, targetSlot);
    }

    const result = assignItemToEquipmentSlot(
      this.normalizedItems(),
      itemId,
      targetSlot as EquipmentUiSlotId,
    );
    if (result.ok) {
      this.commitNormalized(result.items);
    }
    return result;
  }



  /** Atualiza `slot` do item — alias `head` → `helmet` (slot UI do SET). */

  updateItemSlot(

    itemId: string,

    targetSlot: string,

  ): ReturnType<typeof assignItemToEquipmentSlot> | { readonly ok: false; readonly reason: 'invalid_slot' } {

    const uiSlot = resolveUiSlotAlias(targetSlot);

    if (!uiSlot) {

      return { ok: false, reason: 'invalid_slot' };

    }

    return this.equipItemById(itemId, uiSlot);

  }



  unequipSlot(uiSlotId: EquipmentUiSlotId): ReturnType<typeof assignEquipmentSlotToInventory> {

    const result = assignEquipmentSlotToInventory(this.normalizedItems(), uiSlotId);

    if (result.ok) {

      this.commitNormalized(result.items);

    }

    return result;

  }



  hydrateFromServerBundle(

    stacks: readonly InventoryStack[],

    options?: { readonly uiGrid?: EquipmentUiGridState; readonly equipped?: EquippedSlots },

    syncOptions?: ServerHydrateOptions,

  ): void {

    const records = buildItemRecordsFromServerBundle(stacks, options?.uiGrid, options?.equipped);

    if (syncOptions?.immediate) {

      cancelScheduledFrame(this.serverHydrateFrame);

      this.serverHydrateFrame = null;

      this.pendingServerRecords = null;

      this.commitNormalized(records);

      return;

    }

    this.pendingServerRecords = records;

    this.schedulePendingServerHydrate();

  }



  /** Força commit de hydrate batched — testes e full-state antes de assert. */

  flushPendingServerHydrate(): void {

    cancelScheduledFrame(this.serverHydrateFrame);

    this.serverHydrateFrame = null;

    if (!this.pendingServerRecords) return;

    const records = this.pendingServerRecords;

    this.pendingServerRecords = null;

    this.commitNormalized(records);

  }



  private schedulePendingServerHydrate(): void {

    if (this.serverHydrateFrame !== null) return;

    this.serverHydrateFrame = scheduleNextFrame(() => {

      this.serverHydrateFrame = null;

      if (!this.pendingServerRecords) return;

      const records = this.pendingServerRecords;

      this.pendingServerRecords = null;

      this.commitNormalized(records);

    });

  }



  private cancelPendingServerHydrate(): void {

    cancelScheduledFrame(this.serverHydrateFrame);

    this.serverHydrateFrame = null;

    this.pendingServerRecords = null;

  }



  getInventorySnapshot(): InventorySnapshot {
    ItemStateValidator.auditInventoryEquipmentOverlap(this.items);

    const items = this.normalizedItems();

    return buildInventorySnapshot(inventorySlotsFromItems(items));
  }



  getEquippedSlots(): EquippedSlots {

    return equippedSlotsFromItems(this.normalizedItems());

  }



  toInventoryStacks(): InventoryStack[] {

    return inventoryStacksFromItems(this.normalizedItems());

  }

  computeLocalInventoryChecksum(): string {
    return computeInventoryChecksumFromStacks(this.toInventoryStacks());
  }

  getLastServerInventoryChecksum(): string | null {
    return this.lastServerInventoryChecksum;
  }

  setLastServerInventoryChecksum(checksum: string): void {
    this.lastServerInventoryChecksum = checksum;
  }



  toEquipmentGrid(): EquipmentUiGridState {

    return equipmentGridFromItems(this.normalizedItems());

  }



  getInventoryItems(): readonly PlayerItemRecord[] {

    return filterInventoryItems(this.normalizedItems());

  }



  getEquippedItems(): readonly PlayerItemRecord[] {
    ItemStateValidator.auditInventoryEquipmentOverlap(this.items);

    return filterEquippedItems(this.normalizedItems());
  }



  /** Linha na mochila — ignora cópia equipada no SET. */

  getInventoryItemById(itemId: string): PlayerItemRecord | null {

    const row = this.normalizedItems().find(

      (entry) => entry.itemId === itemId && entry.slot === ItemLocationSlot.Inventory,

    );

    return row ? { ...row } : null;

  }



  getItemById(itemId: string): PlayerItemRecord | null {

    const items = this.normalizedItems();

    const equipped = items.find(

      (row) => row.itemId === itemId && row.slot !== ItemLocationSlot.Inventory,

    );

    if (equipped) return { ...equipped };



    const inventory = items.find(

      (row) => row.itemId === itemId && row.slot === ItemLocationSlot.Inventory,

    );

    return inventory ? { ...inventory } : null;

  }



  /**

   * Toggle equip ↔ inventory — só altera `slot`; UI escuta PLAYER_ITEMS_UPDATED.

   */

  toggleItemSlot(itemId: string, targetSlot?: EquipmentUiSlotId): ReturnType<typeof assignItemToEquipmentSlot> | ReturnType<typeof assignEquipmentSlotToInventory> | { readonly ok: false; readonly reason: 'not_found' } {

    const item = this.getItemById(itemId);

    if (!item) {

      return { ok: false, reason: 'not_found' };

    }

    if (item.slot === ItemLocationSlot.Inventory) {

      return this.equipItemById(itemId, targetSlot);

    }

    return this.unequipSlot(item.slot);

  }



  getItemInSlot(slot: EquipmentUiSlotId): PlayerItemRecord | null {

    return this.normalizedItems().find((row) => row.slot === slot) ?? null;

  }



  /** Remove runas/livros esgotados do SET (cargas zeradas). */

  syncChargedEquipment(): void {

    let items = this.normalizedItems().map((row) => ({ ...row }));

    let changed = false;



    for (const uiSlotId of ['runes', 'books'] as const) {

      const idx = items.findIndex((row) => row.slot === uiSlotId);

      if (idx < 0) continue;

      const row = items[idx]!;

      if (!isChargedEquipmentItemId(row.itemId)) continue;



      const charges = resolveStackDurabilityCharges({

        itemId: row.itemId,

        quantity: row.quantity,

        ...(row.charges !== undefined ? { charges: row.charges } : {}),

      });

      if (charges <= 0) {

        items.splice(idx, 1);

        changed = true;

      }

    }



    if (changed) {

      this.commitNormalized(items);

    }

  }



  /** Notifica assinantes — inventário e SET filtram o mesmo array e redesenham. */

  saveAndSync(): void {

    this.publish();

  }



  reset(): void {

    this.cancelPendingServerHydrate();

    this.items = [];

    this.lastServerInventoryChecksum = null;

    this.revision += 1;

    this.publish();

  }



  private publish(): void {

    const snapshot = this.getSnapshot();

    getPlayerEquipmentStore().loadUiGrid(this.toEquipmentGrid());

    for (const listener of this.listeners) {

      listener(snapshot);

    }

    uiEvents.emit(UIEventType.PLAYER_ITEMS_UPDATED, {

      revision: snapshot.revision,

      items: snapshot.items,

    });

  }

}



let store: PlayerItemStore | null = null;



function isEquipmentUiSlotId(value: string): value is EquipmentUiSlotId {
  return (Object.values(UiSlot) as string[]).includes(value);
}

function resolveUiSlotAlias(targetSlot: string): EquipmentUiSlotId | null {

  if (targetSlot === 'head') {

    return UiSlot.Helmet;

  }

  return isEquipmentUiSlotId(targetSlot) ? targetSlot : null;

}



export function getPlayerItemStore(): PlayerItemStore {

  if (!store) store = new PlayerItemStore();

  return store;

}



export function resetPlayerItemStore(): void {

  store?.reset();

  store = null;

}

