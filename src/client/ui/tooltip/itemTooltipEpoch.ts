// @ts-nocheck
/** Epoch compartilhado — evita ciclo emitItemTooltip ↔ showGameTooltip. */
let itemTooltipEpoch = 0;
export function bumpItemTooltipEpoch() {
    itemTooltipEpoch += 1;
    return itemTooltipEpoch;
}
export function getItemTooltipEpoch() {
    return itemTooltipEpoch;
}
export function cancelPendingItemTooltipEnrichment() {
    itemTooltipEpoch += 1;
}
