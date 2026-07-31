import { useCallback, useSyncExternalStore } from 'react';
import { getGameStateManager } from '../../../../game/GameStateManager.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { getPlayerItemStore } from '../../../../ui/items/playerItemStore.js';
import { emitItemTooltip } from '../../../../ui/tooltip/emitItemTooltip.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { requestBattleItem } from '../../../battle/battlePaletteHandlers.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import { ItemSlotIcon } from '../panels/ItemSlotIcon.js';
import {
  SIDEBAR_CONSUMABLE_HOTBAR_SLOTS,
  resolveSidebarConsumableHotbar,
} from './resolveSidebarConsumableHotbar.js';

function useConsumableHotbarEntries() {
  const revision = useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore((listener) => getPlayerItemStore().subscribe(() => listener()), onChange),
    () => {
      const stacks = getPlayerItemStore().toInventoryStacks();
      return stacks.map((s) => `${s.itemId}:${s.quantity}`).join('|');
    },
    () => '',
  );

  void revision;
  return resolveSidebarConsumableHotbar(getPlayerItemStore().toInventoryStacks());
}

/**
 * Hotbar lateral — espelho de poções do inventário.
 * Uso: só em combate (mesma regra da barra de batalha).
 */
export function WorldSidebarConsumablesHotbar({
  interactive = true,
}: {
  readonly interactive?: boolean;
}) {
  const entries = useConsumableHotbarEntries();
  const slots = Array.from({ length: SIDEBAR_CONSUMABLE_HOTBAR_SLOTS }, (_, index) => entries[index] ?? null);

  const onUse = useCallback((itemId: string) => {
    if (!interactive) return;
    if (getGameStateManager().isExploration()) {
      alertSystem('Consumíveis só podem ser usados em combate.');
      return;
    }
    requestBattleItem(itemId);
  }, [interactive]);

  return (
    <div className="sidebar-hotbar" aria-label="Consumíveis">
      <p className="sidebar-segment__label">ITENS</p>
      <div className="sidebar-hotbar__grid" role="list">
        {slots.map((entry, index) => {
          if (!entry) {
            return (
              <div
                key={`empty-${index}`}
                className="sidebar-hotbar__slot sidebar-hotbar__slot--empty"
                role="listitem"
                aria-label="Slot vazio"
              />
            );
          }
          return (
            <button
              key={entry.itemId}
              type="button"
              className="sidebar-hotbar__slot"
              role="listitem"
              aria-label={`${entry.label}, x${entry.quantity}`}
              title={`${entry.label} ×${entry.quantity}`}
              disabled={!interactive}
              onClick={() => onUse(entry.itemId)}
              onMouseEnter={(event) => emitItemTooltip(entry.itemId, event.clientX, event.clientY)}
              onMouseLeave={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}
            >
              <ItemSlotIcon itemId={entry.itemId} className="sidebar-hotbar__icon" />
              <span className="sidebar-hotbar__qty">{entry.quantity > 99 ? '99+' : entry.quantity}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
