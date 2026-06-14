import type { EquippedSlots, InventoryStack } from '../../shared/character/equipmentState.js';
import type { EquipmentUiGridState } from '../../shared/character/equipmentUiSlots.js';
import { equippedToEquipmentUiGrid } from '../../shared/character/equipmentUiSlots.js';
import type { InventoryUpdatedPayload } from '../../shared/economy/events.js';
import {
  coalescePlayerItemRecords,
  findInventoryEquipmentOverlap,
  mergeEquipmentUiGridPreservingLocalEquipped,
} from '../../shared/character/itemSlotModel.js';
import { DEMO_STARTER_INVENTORY_STACKS } from '../../shared/demo/demoStarterInventory.js';
import { normalizeChargedInventoryStacks } from '../../shared/items/chargedEquipment.js';
import type { InventorySnapshot } from '../../shared/character/inventorySlots.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { cancelScheduledFrame, scheduleNextFrame } from '../sync/frameScheduler.js';
import { getPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';

/** @deprecated Use applyServerItemBundle — mantido para mock sync. */
export function applyAuthoritativeItemState(
  inventoryStacks: readonly InventoryStack[],
  equipped: EquippedSlots,
  options?: {
    readonly dedupeEquippedFromInventory?: boolean;
    readonly uiGrid?: EquipmentUiGridState;
    readonly inventoryOnly?: boolean;
  },
): void {
  void options?.dedupeEquippedFromInventory;
  if (options?.inventoryOnly) {
    applyServerItemBundle({ stacks: inventoryStacks, inventoryOnly: true });
    return;
  }
  getPlayerItemStore().hydrateFromServerBundle(inventoryStacks, {
    equipped,
    ...(options?.uiGrid !== undefined ? { uiGrid: options.uiGrid } : {}),
  });

  const mock = getMockEconomyService();
  if (mock && getActionDispatcher().getMode() !== 'online') {
    mock.syncInventoryStacksFromClient(getPlayerItemStore().toInventoryStacks());
  }
}

export function stacksFromInventoryPayload(
  items: InventoryUpdatedPayload['items'],
): InventoryStack[] {
  return items.map((row) => ({
    itemId: row.itemId,
    quantity: row.quantity,
    ...(row.charges !== undefined ? { charges: row.charges } : {}),
    ...(row.lockedQuantity !== undefined ? { lockedQuantity: row.lockedQuantity } : {}),
  }));
}

export function stacksFromInventorySnapshot(slots: InventorySnapshot['slots']): InventoryStack[] {
  return slots
    .filter((slot) => slot.itemId)
    .map((slot) => ({
      itemId: slot.itemId!,
      quantity: slot.quantity,
      ...(slot.charges !== undefined ? { charges: slot.charges } : {}),
      ...(slot.lockedQuantity !== undefined ? { lockedQuantity: slot.lockedQuantity } : {}),
    }));
}

/** Apply autoritativo — substitui o array inteiro de itens (modelo slot). */
export function applyServerItemBundle(input: {
  readonly stacks: readonly InventoryStack[];
  readonly equipped?: EquippedSlots;
  readonly equipmentUiGrid?: EquipmentUiGridState;
  readonly inventoryOnly?: boolean;
  readonly immediate?: boolean;
}): void {
  const itemStore = getPlayerItemStore();
  const syncOptions = input.immediate ? { immediate: true as const } : undefined;
  if (input.inventoryOnly) {
    const grid = itemStore.toEquipmentGrid();
    const hasEquipped = Object.values(grid).some(Boolean);
    itemStore.hydrateFromServerBundle(
      input.stacks,
      hasEquipped ? { uiGrid: grid } : undefined,
      syncOptions,
    );
  } else {
    const grid = input.equipmentUiGrid !== undefined
      ? input.equipmentUiGrid
      : equippedToEquipmentUiGrid(input.equipped ?? {});
    itemStore.hydrateFromServerBundle(input.stacks, { uiGrid: grid }, syncOptions);
  }

  if (!input.immediate) {
    itemStore.flushPendingServerHydrate();
  }

  itemStore.syncChargedEquipment();

  const mock = getMockEconomyService();
  if (mock && getActionDispatcher().getMode() !== 'online') {
    mock.syncInventoryStacksFromClient(itemStore.toInventoryStacks());
  }
}

let pendingInventoryPayload: Pick<
  InventoryUpdatedPayload,
  'items' | 'equipped' | 'equipmentUiGrid'
> | null = null;
let inventoryFlushFrame: number | null = null;
let lastAppliedInventoryRevision: number | undefined;

function flushPendingInventoryPayload(): void {
  inventoryFlushFrame = null;
  const payload = pendingInventoryPayload;
  pendingInventoryPayload = null;
  if (!payload) return;
  applyInventoryUpdatedPayload(payload);
}

/** Batched por frame — evita N re-renders quando vários pacotes chegam seguidos. */
export function scheduleInventoryUpdatedPayload(
  payload: Pick<InventoryUpdatedPayload, 'items' | 'equipped' | 'equipmentUiGrid' | 'revision'>,
): void {
  if (
    payload.revision !== undefined
    && payload.revision === lastAppliedInventoryRevision
  ) {
    return;
  }

  pendingInventoryPayload = payload;
  if (inventoryFlushFrame !== null) return;
  inventoryFlushFrame = scheduleNextFrame(flushPendingInventoryPayload);
}

export function flushPendingInventorySync(): void {
  cancelScheduledFrame(inventoryFlushFrame);
  flushPendingInventoryPayload();
}

export function resetInventorySyncScheduler(): void {
  cancelScheduledFrame(inventoryFlushFrame);
  inventoryFlushFrame = null;
  pendingInventoryPayload = null;
  lastAppliedInventoryRevision = undefined;
}

export function applyInventoryUpdatedPayload(
  payload: Pick<InventoryUpdatedPayload, 'items' | 'equipped' | 'equipmentUiGrid' | 'revision'>,
): void {
  if (
    payload.revision !== undefined
    && payload.revision === lastAppliedInventoryRevision
  ) {
    return;
  }

  const stacks = stacksFromInventoryPayload(payload.items);
  const store = getPlayerItemStore();
  const localGrid = store.toEquipmentGrid();
  const payloadGrid = resolveAuthoritativeUiGrid(
    payload.equipped ?? {},
    payload.equipmentUiGrid,
  );
  let grid: EquipmentUiGridState;

  if (payload.equipmentUiGrid !== undefined) {
    grid = mergeEquipmentUiGridPreservingLocalEquipped(
      { ...payload.equipmentUiGrid },
      localGrid,
      stacks,
    );
  } else if (Object.values(payloadGrid).some(Boolean)) {
    grid = mergeEquipmentUiGridPreservingLocalEquipped(payloadGrid, localGrid, stacks);
  } else {
    grid = localGrid;
  }

  applyServerItemBundle({
    stacks,
    equipmentUiGrid: grid,
    equipped: payload.equipped ?? {},
  });

  getPlayerStatsGateway().refreshFromAuthoritativeGrid(grid);

  const overlap = findInventoryEquipmentOverlap(store.getItems());
  if (overlap.length > 0) {
    store.replaceAll(coalescePlayerItemRecords(store.getItems()));
  }

  if (payload.revision !== undefined) {
    lastAppliedInventoryRevision = payload.revision;
  }
}

export function bootstrapMvpPlayerItems(): void {
  const store = getPlayerItemStore();
  if (store.getItems().length > 0) return;

  const stacks = normalizeChargedInventoryStacks(
    DEMO_STARTER_INVENTORY_STACKS.map((row) => ({ ...row })),
  );
  store.hydrateFromServerBundle(stacks, undefined, { immediate: true });
}

export function bootstrapEmptyPlayerItems(): void {
  getPlayerItemStore().hydrateFromServerBundle([], undefined, { immediate: true });
}

export function resolveAuthoritativeUiGrid(
  equipped: EquippedSlots,
  uiGrid?: EquipmentUiGridState,
): EquipmentUiGridState {
  if (uiGrid) return { ...uiGrid };
  return equippedToEquipmentUiGrid(equipped);
}
