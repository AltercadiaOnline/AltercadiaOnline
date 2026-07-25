/** Epoch compartilhado — evita ciclo emitItemTooltip ↔ showGameTooltip. */
let itemTooltipEpoch = 0;

export function bumpItemTooltipEpoch(): number {
  itemTooltipEpoch += 1;
  return itemTooltipEpoch;
}

export function getItemTooltipEpoch(): number {
  return itemTooltipEpoch;
}

export function cancelPendingItemTooltipEnrichment(): void {
  itemTooltipEpoch += 1;
}
