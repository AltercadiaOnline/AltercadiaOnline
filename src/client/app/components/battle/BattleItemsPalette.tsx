import { type MouseEvent } from 'react';
import { getCatalogItem } from '../../../../shared/items/itemCatalog.js';
import type { BattleConsumableRow } from '../../../hud/battleConsumables.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';

type BattleItemsPaletteProps = {
  items: readonly BattleConsumableRow[];
  enabled: boolean;
  turnBlocked: boolean;
  onUseItem: (itemId: string) => void;
};

function showItemTooltip(itemId: string, event: MouseEvent<HTMLButtonElement>): void {
  const item = getCatalogItem(itemId);
  if (!item) return;
  uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
    data: { kind: 'item', data: item },
    x: event.clientX,
    y: event.clientY,
  });
}

export function BattleItemsPalette({
  items,
  enabled,
  turnBlocked,
  onUseItem,
}: BattleItemsPaletteProps) {
  const paletteEnabled = enabled && !turnBlocked;

  return (
    <div
      id="react-battle-items-row"
      className={[
        'skill-palette',
        'battle-items-drawer',
        'battle-items-menu',
        paletteEnabled ? '' : 'is-disabled',
      ].filter(Boolean).join(' ')}
      data-hud-battle-items
      aria-label="Consumíveis de combate"
      aria-disabled={!paletteEnabled}
    >
      {items.length === 0 ? (
        <p className="battle-items-menu__empty">Nenhum consumível de combate no inventário.</p>
      ) : (
        items.map((item) => (
          <button
            key={item.itemId}
            type="button"
            className="battle-menu-btn battle-item-slot slot-item--kind-consumable"
            data-item-id={item.itemId}
            disabled={!paletteEnabled || item.quantity < 1}
            onMouseEnter={(event) => showItemTooltip(item.itemId, event)}
            onMouseLeave={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}
            onClick={() => onUseItem(item.itemId)}
          >
            <span className="battle-item-slot__abbrev" aria-hidden="true">{item.abbrev}</span>
            <span className="battle-item-slot__name">{item.name}</span>
            <span className="battle-item-slot__qty">
              ×
              {item.quantity}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
