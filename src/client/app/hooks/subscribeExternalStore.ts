/**
 * Adapta stores Altercadia (notify síncrono no subscribe) ao contrato do
 * `useSyncExternalStore` — notify durante subscribe → React #185.
 */
export function subscribeExternalStore(
  subscribe: (listener: () => void) => () => void,
  onStoreChange: () => void,
): () => void {
  let primed = false;
  return subscribe(() => {
    if (!primed) {
      primed = true;
      return;
    }
    onStoreChange();
  });
}
