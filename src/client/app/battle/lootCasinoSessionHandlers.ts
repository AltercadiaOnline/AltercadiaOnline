export type LootCasinoSessionHandlers = {
  readonly onConfirm?: () => boolean | void | Promise<boolean | void>;
  readonly onDismiss?: () => void;
  readonly onSpinSettled?: () => void;
  readonly onRetry?: () => void;
};

let handlers: LootCasinoSessionHandlers | null = null;

export function registerLootCasinoSessionHandlers(bundle: LootCasinoSessionHandlers): void {
  handlers = bundle;
}

export function clearLootCasinoSessionHandlers(): void {
  handlers = null;
}

export function triggerLootCasinoConfirm(): void {
  const action = handlers?.onConfirm;
  if (!action) return;
  void Promise.resolve(action());
}

export function triggerLootCasinoDismiss(): void {
  handlers?.onDismiss?.();
}

export function triggerLootCasinoSpinSettled(): void {
  handlers?.onSpinSettled?.();
}

export function triggerLootCasinoRetry(): void {
  const action = handlers?.onRetry;
  if (!action) return;
  void Promise.resolve(action());
}

export async function runLootCasinoConfirm(): Promise<boolean | void> {
  const action = handlers?.onConfirm;
  if (!action) return;
  return Promise.resolve(action());
}
