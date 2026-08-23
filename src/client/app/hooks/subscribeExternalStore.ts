/**
 * Adapta stores Altercadia (notify síncrono no subscribe) ao contrato do
 * `useSyncExternalStore` — notify *durante* subscribe → React #185.
 * Só ignora o notify síncrono da inscrição; o primeiro open da HUD tem que pintar.
 */
export function subscribeExternalStore(
  subscribe: (listener: () => void) => () => void,
  onStoreChange: () => void,
): () => void {
  let ignoreSyncNotify = true;
  const unsubscribe = subscribe(() => {
    if (ignoreSyncNotify) return;
    onStoreChange();
  });
  ignoreSyncNotify = false;
  return unsubscribe;
}
