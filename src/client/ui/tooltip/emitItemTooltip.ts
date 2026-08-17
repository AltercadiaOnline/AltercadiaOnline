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
  formatItemChargesLabel,
  isChargedInventoryStackItemId,
  resolveItemMaxCharges,
  resolveStackDurabilityCharges,
} from '../../../shared/items/chargedEquipment.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  bumpItemTooltipEpoch,
  getItemTooltipEpoch,
} from './itemTooltipEpoch.js';
import { showGameTooltip, showHintTooltip } from './showGameTooltip.js';

export type EmitItemTooltipOptions = {
  readonly heldAmountLabel?: string;
  /** Cargas do stack sob o cursor (inventário, banco, SET). */
  readonly chargesCurrent?: number;
  readonly chargesMax?: number;
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

function resolveChargesTooltipLabel(
  itemId: string,
  options: EmitItemTooltipOptions,
): string | undefined {
  if (!isChargedInventoryStackItemId(itemId)) return undefined;
  const max = options.chargesMax ?? resolveItemMaxCharges(itemId);
  if (max <= 0) return undefined;

  if (options.chargesCurrent !== undefined) {
    return formatItemChargesLabel(options.chargesCurrent, max);
  }

  const row = getPlayerItemStore().getItemById(itemId);
  const current = row
    ? resolveStackDurabilityCharges({
        itemId: row.itemId,
        quantity: row.quantity,
        ...(row.charges !== undefined ? { charges: row.charges } : {}),
      })
    : max;
  return formatItemChargesLabel(current, max);
}

function emitItemData(
  item: ItemDefinition,
  clientX: number,
  clientY: number,
  options: EmitItemTooltipOptions,
): void {
  const chargesLabel = resolveChargesTooltipLabel(item.id, options);
  showGameTooltip({
    data: {
      kind: 'item',
      data: item,
      ...(options.heldAmountLabel ? { heldAmountLabel: options.heldAmountLabel } : {}),
      ...(chargesLabel ? { chargesLabel } : {}),
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
