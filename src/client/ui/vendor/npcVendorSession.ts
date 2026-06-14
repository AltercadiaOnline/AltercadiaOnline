/** Loja NPC aberta — inventário exibe dicas de raridade bloqueada. */
let npcVendorShopOpen = false;
const listeners = new Set<() => void>();

export function setNpcVendorShopOpen(open: boolean): void {
  if (npcVendorShopOpen === open) return;
  npcVendorShopOpen = open;
  for (const listener of listeners) listener();
}

export function isNpcVendorShopOpen(): boolean {
  return npcVendorShopOpen;
}

export function subscribeNpcVendorShopOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
