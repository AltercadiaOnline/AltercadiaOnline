import { describe, expect, it } from 'vitest';
import {
  addItemToInventoryStacks,
} from './inventoryStackOps.js';
import {
  applyEquipToUiGrid,
  applyUnequipFromUiGrid,
} from './equipUiGridTransaction.js';
import {
  ItemLocationSlot,
  assignItemToEquipmentSlot,
  buildItemRecordsFromServerBundle,
  coalescePlayerItemRecords,
  filterEquippedItems,
  filterInventoryItems,
  findDuplicateItemInstanceIds,
  findInventoryEquipmentOverlap,
  inventorySlotsFromItems,
  mergeEquipmentUiGridPreservingLocalEquipped,
} from './itemSlotModel.js';
import {
  createEmptyEquipmentUiGrid,
  EquipmentUiSlotId,
} from './equipmentUiSlots.js';

const HELM = 'gnawed_bone_helm';

function equippedHelmGrid() {
  return { ...createEmptyEquipmentUiGrid(), [EquipmentUiSlotId.Helmet]: HELM };
}

describe('cópias extras do mesmo item equipável', () => {
  it('hidrata loot na mochila mesmo com o mesmo itemId vestido no SET', () => {
    const items = buildItemRecordsFromServerBundle(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
    );

    const bag = filterInventoryItems(items);
    const worn = filterEquippedItems(items);

    expect(bag).toHaveLength(1);
    expect(bag[0]?.itemId).toBe(HELM);
    expect(worn).toHaveLength(1);
    expect(worn[0]?.itemId).toBe(HELM);
    expect(worn[0]?.slot).toBe(EquipmentUiSlotId.Helmet);
    expect(bag[0]?.instanceId).not.toBe(worn[0]?.instanceId);
    expect(findInventoryEquipmentOverlap(items)).toEqual([]);
  });

  it('coalesce não apaga a cópia da bag', () => {
    const items = buildItemRecordsFromServerBundle(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
    );
    const next = coalescePlayerItemRecords(items);
    expect(filterInventoryItems(next)).toHaveLength(1);
    expect(filterEquippedItems(next)).toHaveLength(1);
    expect(inventorySlotsFromItems(next).some((slot) => slot.itemId === HELM)).toBe(true);
  });

  it('equipar + loot (add na bag) mantém SET e a nova cópia', () => {
    const first = addItemToInventoryStacks([], HELM, 1);
    const equipped = applyEquipToUiGrid(first.stacks, createEmptyEquipmentUiGrid(), HELM);
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;

    expect(equipped.inventory.filter((row) => row.itemId === HELM)).toHaveLength(0);

    const looted = addItemToInventoryStacks(equipped.inventory, HELM, 1);
    expect(looted.added).toBe(1);

    const items = buildItemRecordsFromServerBundle(looted.stacks, equipped.grid);
    expect(filterInventoryItems(items).map((row) => row.itemId)).toEqual([HELM]);
    expect(filterEquippedItems(items).map((row) => row.itemId)).toEqual([HELM]);
  });

  it('não consome a cópia da bag ao re-equipar o mesmo item já vestido', () => {
    const equipped = applyEquipToUiGrid(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
      HELM,
    );
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    expect(equipped.inventory).toEqual([{ itemId: HELM, quantity: 1 }]);
    expect(equipped.grid[EquipmentUiSlotId.Helmet]).toBe(HELM);
  });

  it('desequipar com cópia extra na bag resulta em duas unidades na mochila', () => {
    const unequip = applyUnequipFromUiGrid(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
      EquipmentUiSlotId.Helmet,
    );
    expect(unequip.ok).toBe(true);
    if (!unequip.ok) return;
    const qty = unequip.inventory
      .filter((row) => row.itemId === HELM)
      .reduce((sum, row) => sum + row.quantity, 0);
    expect(qty).toBe(2);
    expect(unequip.grid[EquipmentUiSlotId.Helmet]).toBeNull();
  });

  it('assignItemToEquipmentSlot não come a cópia extra se o slot já tem o mesmo item', () => {
    const items = buildItemRecordsFromServerBundle(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
    );
    const result = assignItemToEquipmentSlot(items, HELM, EquipmentUiSlotId.Helmet);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(filterInventoryItems(result.items)).toHaveLength(1);
    expect(filterEquippedItems(result.items)).toHaveLength(1);
  });

  it('merge de grid vazio não desveste só porque o loot caiu na bag', () => {
    const merged = mergeEquipmentUiGridPreservingLocalEquipped(
      createEmptyEquipmentUiGrid(),
      equippedHelmGrid(),
      [{ itemId: HELM, quantity: 1 }],
    );
    expect(merged[EquipmentUiSlotId.Helmet]).toBe(HELM);
  });

  it('detecta instanceId duplicado, não overlap de catálogo', () => {
    const items = buildItemRecordsFromServerBundle(
      [{ itemId: HELM, quantity: 1 }],
      equippedHelmGrid(),
    );
    expect(findDuplicateItemInstanceIds(items)).toEqual([]);
    expect(findInventoryEquipmentOverlap(items)).toEqual([]);

    const cloned = [...items, { ...items[0]!, slot: ItemLocationSlot.Inventory }];
    expect(findDuplicateItemInstanceIds(cloned)).toEqual([items[0]!.instanceId]);
  });
});
