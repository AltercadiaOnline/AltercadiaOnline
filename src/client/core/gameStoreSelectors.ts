/**
 * Selectors de leitura para UI — derivam views do GameStore sem mutar estado.
 * UI importa apenas daqui (ou subscribeGameStore), nunca de domain stores.
 */

import type { GameStoreState } from '../state/GameStore.js';
import { getGameStore } from '../state/GameStore.js';
import { getItemById } from '../../shared/items/itemCatalog.js';
import {
  isWalletBackedCurrencyItemId,
  resolveWalletCurrencySlotQtyLabel,
} from '../ui/inventory/inventoryCurrencyDisplay.js';

export function selectGameState(): GameStoreState {
  return getGameStore().getState();
}

export function selectPlayerGold(state: GameStoreState = selectGameState()) {
  return state.player.gold;
}

export function selectPlayerInventory(state: GameStoreState = selectGameState()) {
  return state.player.inventory;
}

export function selectPlayerEquipment(state: GameStoreState = selectGameState()) {
  return state.player.equipment;
}

export function isSyncPending(state: GameStoreState = selectGameState()): boolean {
  return Object.keys(state.pendingActions).length > 0;
}

export function selectInventorySyncIndicatorHtml(
  state: GameStoreState = selectGameState(),
): string {
  return isSyncPending(state)
    ? '<span class="inventory-panel__sync" aria-busy="true" title="Sincronizando…">⟳</span>'
    : '';
}

export function selectInventorySlotTooltipLabel(
  itemId: string,
  state: GameStoreState = selectGameState(),
): string | undefined {
  if (!isWalletBackedCurrencyItemId(itemId)) return undefined;
  return resolveWalletCurrencySlotQtyLabel(itemId, state.player.gold) ?? undefined;
}

export function selectItemDisplayName(itemId: string): string {
  return getItemById(itemId)?.name ?? itemId;
}

export function selectBalanceChangedPayload() {
  return getGameStore().buildBalanceChangedPayload();
}
