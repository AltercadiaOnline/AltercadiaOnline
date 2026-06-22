import type { ItemDefinition } from '../../../shared/items/itemSchema.js';
import {
  getItemById,
  resolveItemDefinitionForDisplay,
} from '../../../shared/items/itemCatalog.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export type EmitItemTooltipOptions = {
  readonly heldAmountLabel?: string;
  readonly vendorOpen?: boolean;
  readonly placement?: 'auto' | 'above' | 'below';
};

const pendingTooltipLoads = new Map<string, Promise<ItemDefinition | undefined>>();

function loadItemForTooltip(itemId: string): Promise<ItemDefinition | undefined> {
  const pending = pendingTooltipLoads.get(itemId);
  if (pending) return pending;

  const promise = resolveItemDefinitionForDisplay(itemId).finally(() => {
    pendingTooltipLoads.delete(itemId);
  });
  pendingTooltipLoads.set(itemId, promise);
  return promise;
}

/**
 * Exibe tooltip de item com lazy load de metadados estendidos (descrição/efeitos/lore).
 * Usa o core imediatamente para casos especiais (ex.: hint de marketplace).
 */
export function emitItemTooltip(
  itemId: string,
  clientX: number,
  clientY: number,
  options: EmitItemTooltipOptions = {},
): void {
  const core = getItemById(itemId);
  if (!core) return;

  if (
    options.vendorOpen
    && isMarketplaceListableItem(itemId)
    && !isNpcVendorSellableItem(itemId)
  ) {
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: {
        kind: 'marco',
        data: { name: core.name, effect: NPC_HIGH_VALUE_MARKETPLACE_HINT },
      },
      x: clientX,
      y: clientY,
      ...(options.placement ? { placement: options.placement } : {}),
    });
    return;
  }

  void loadItemForTooltip(itemId).then((item) => {
    if (!item) return;
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: {
        kind: 'item',
        data: item,
        ...(options.heldAmountLabel ? { heldAmountLabel: options.heldAmountLabel } : {}),
      },
      x: clientX,
      y: clientY,
      ...(options.placement ? { placement: options.placement } : {}),
    });
  });
}
