import type { ItemDefinition } from '../../../shared/items/itemSchema.js';
import {
  getItemById,
  getItemMechanicalById,
  resolveItemDefinitionForDisplay,
} from '../../../shared/items/itemCatalog.js';
import { mergeItemDefinitionParts } from '../../../shared/items/itemCatalogMerge.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import {
  bumpItemTooltipEpoch,
  getItemTooltipEpoch,
} from './itemTooltipEpoch.js';
import { showGameTooltip, showHintTooltip } from './showGameTooltip.js';

export type EmitItemTooltipOptions = {
  readonly heldAmountLabel?: string;
  readonly vendorOpen?: boolean;
  readonly placement?: 'auto' | 'above' | 'below';
};

const pendingTooltipLoads = new Map<string, Promise<ItemDefinition | undefined>>();

function loadItemForTooltip(itemId: string): Promise<ItemDefinition | undefined> {
  const pending = pendingTooltipLoads.get(itemId);
  if (pending) return pending;

  const promise = resolveItemDefinitionForDisplay(itemId)
    .catch(() => undefined)
    .finally(() => {
      pendingTooltipLoads.delete(itemId);
    });
  pendingTooltipLoads.set(itemId, promise);
  return promise;
}

function buildImmediateItemDefinition(itemId: string): ItemDefinition | undefined {
  const core = getItemById(itemId);
  if (!core) return undefined;
  return mergeItemDefinitionParts(core, getItemMechanicalById(itemId));
}

function emitItemData(
  item: ItemDefinition,
  clientX: number,
  clientY: number,
  options: EmitItemTooltipOptions,
): void {
  showGameTooltip({
    data: {
      kind: 'item',
      data: item,
      ...(options.heldAmountLabel ? { heldAmountLabel: options.heldAmountLabel } : {}),
    },
    x: clientX,
    y: clientY,
    ...(options.placement ? { placement: options.placement } : {}),
  });
}

/**
 * Exibe tooltip de item com core/mecânica **na hora** e enriquece descrição/efeitos/lore
 * quando o lazy load terminar (sem reaparecer se o hover já saiu).
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
    showHintTooltip(core.name, clientX, clientY, {
      lines: [NPC_HIGH_VALUE_MARKETPLACE_HINT],
      ...(options.placement ? { placement: options.placement } : {}),
    });
    return;
  }

  const epoch = bumpItemTooltipEpoch();
  const immediate = buildImmediateItemDefinition(itemId);
  if (immediate) {
    emitItemData(immediate, clientX, clientY, options);
  }

  void loadItemForTooltip(itemId).then((item) => {
    if (epoch !== getItemTooltipEpoch() || !item) return;
    emitItemData(item, clientX, clientY, options);
  });
}

export { cancelPendingItemTooltipEnrichment } from './itemTooltipEpoch.js';
