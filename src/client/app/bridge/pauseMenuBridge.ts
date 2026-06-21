type PauseMenuListener = (open: boolean) => void;

export type PauseMenuHandlers = {
  readonly onExit: () => void;
  readonly onSettings?: () => void;
};

class PauseMenuBridge {
  private open = false;

  private handlers: PauseMenuHandlers | null = null;

  private readonly listeners = new Set<PauseMenuListener>();

  subscribe(listener: PauseMenuListener): () => void {
    this.listeners.add(listener);
    listener(this.open);
    return () => this.listeners.delete(listener);
  }

  isOpen(): boolean {
    return this.open;
  }

  bindHandlers(handlers: PauseMenuHandlers): void {
    this.handlers = handlers;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.emit();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.emit();
  }

  toggle(): void {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  triggerExit(): void {
    this.hide();
    this.handlers?.onExit();
  }

  triggerSettings(): void {
    if (this.handlers?.onSettings) {
      this.handlers.onSettings();
      return;
    }
    window.alert('Configurações em breve.');
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.open);
    }
  }
}

type GlobalWithPauseMenuBridge = typeof globalThis & {
  __ALTERCADIA_PAUSE_MENU_BRIDGE__?: PauseMenuBridge;
};

export function getPauseMenuBridge(): PauseMenuBridge {
  const globalBridge = globalThis as GlobalWithPauseMenuBridge;
  if (!globalBridge.__ALTERCADIA_PAUSE_MENU_BRIDGE__) {
    globalBridge.__ALTERCADIA_PAUSE_MENU_BRIDGE__ = new PauseMenuBridge();
  }
  return globalBridge.__ALTERCADIA_PAUSE_MENU_BRIDGE__;
}
