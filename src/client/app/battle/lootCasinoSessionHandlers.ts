export type LootCasinoSessionHandlers = {
  readonly onConfirm?: () => boolean | void | Promise<boolean | void>;
  readonly onDismiss?: () => void;
  readonly onSpinSettled?: () => void;
  readonly onRetry?: () => void;
};

type GlobalWithLootCasinoHandlers = typeof globalThis & {
  __ALTERCADIA_LOOT_CASINO_HANDLERS__?: LootCasinoSessionHandlers | null;
};

function getHandlers(): LootCasinoSessionHandlers | null {
  return (globalThis as GlobalWithLootCasinoHandlers).__ALTERCADIA_LOOT_CASINO_HANDLERS__ ?? null;
}

/** Singleton cross-bundle — botões do cassino (confirmar/descartar/retry) no React. */
export function registerLootCasinoSessionHandlers(bundle: LootCasinoSessionHandlers): void {
  (globalThis as GlobalWithLootCasinoHandlers).__ALTERCADIA_LOOT_CASINO_HANDLERS__ = bundle;
}

export function clearLootCasinoSessionHandlers(): void {
  (globalThis as GlobalWithLootCasinoHandlers).__ALTERCADIA_LOOT_CASINO_HANDLERS__ = null;
}

export function triggerLootCasinoConfirm(): void {
  const action = getHandlers()?.onConfirm;
  if (!action) return;
  void Promise.resolve(action());
}

export function triggerLootCasinoDismiss(): void {
  getHandlers()?.onDismiss?.();
}

export function triggerLootCasinoSpinSettled(): void {
  getHandlers()?.onSpinSettled?.();
}

export function triggerLootCasinoRetry(): void {
  const action = getHandlers()?.onRetry;
  if (!action) return;
  void Promise.resolve(action());
}

export async function runLootCasinoConfirm(): Promise<boolean | void> {
  const action = getHandlers()?.onConfirm;
  if (!action) return;
  return Promise.resolve(action());
}
