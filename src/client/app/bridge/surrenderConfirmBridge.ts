export type BattleSurrenderKind = 'pve' | 'pvp';

type SurrenderConfirmListener = (open: boolean) => void;

class SurrenderConfirmBridge {
  private open = false;

  private kind: BattleSurrenderKind = 'pve';

  private confirmHandler: (() => void) | null = null;

  private readonly listeners = new Set<SurrenderConfirmListener>();

  subscribe(listener: SurrenderConfirmListener): () => void {
    this.listeners.add(listener);
    listener(this.open);
    return () => this.listeners.delete(listener);
  }

  isOpen(): boolean {
    return this.open;
  }

  getKind(): BattleSurrenderKind {
    return this.kind;
  }

  show(onConfirm: () => void, kind: BattleSurrenderKind = 'pve'): void {
    this.dismiss();
    this.confirmHandler = onConfirm;
    this.kind = kind;
    this.open = true;
    this.emit();
  }

  dismiss(): void {
    if (!this.open && !this.confirmHandler) return;
    this.open = false;
    this.confirmHandler = null;
    this.kind = 'pve';
    this.emit();
  }

  confirm(): void {
    const handler = this.confirmHandler;
    this.dismiss();
    handler?.();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.open);
    }
  }
}

type GlobalWithSurrenderConfirmBridge = typeof globalThis & {
  __ALTERCADIA_SURRENDER_CONFIRM_BRIDGE__?: SurrenderConfirmBridge;
};

export function getSurrenderConfirmBridge(): SurrenderConfirmBridge {
  const globalBridge = globalThis as GlobalWithSurrenderConfirmBridge;
  if (!globalBridge.__ALTERCADIA_SURRENDER_CONFIRM_BRIDGE__) {
    globalBridge.__ALTERCADIA_SURRENDER_CONFIRM_BRIDGE__ = new SurrenderConfirmBridge();
  }
  return globalBridge.__ALTERCADIA_SURRENDER_CONFIRM_BRIDGE__;
}
