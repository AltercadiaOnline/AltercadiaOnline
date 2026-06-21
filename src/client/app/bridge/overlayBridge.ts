export type OverlayState = {
  readonly initLoadingVisible: boolean;
  readonly initLoadingMessage: string;
};

type OverlayListener = (state: OverlayState) => void;

const DEFAULT_STATE: OverlayState = {
  initLoadingVisible: false,
  initLoadingMessage: 'Carregando perfil no servidor…',
};

class OverlayBridge {
  private state: OverlayState = DEFAULT_STATE;

  private readonly listeners = new Set<OverlayListener>();

  subscribe(listener: OverlayListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  snapshot(): OverlayState {
    return this.state;
  }

  showInitLoading(message: string): void {
    this.state = {
      initLoadingVisible: true,
      initLoadingMessage: message,
    };
    this.emit();
  }

  hideInitLoading(): void {
    if (!this.state.initLoadingVisible) return;
    this.state = {
      ...this.state,
      initLoadingVisible: false,
    };
    this.emit();
  }

  updateInitLoadingMessage(message: string): void {
    this.state = {
      ...this.state,
      initLoadingMessage: message,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

type GlobalWithOverlayBridge = typeof globalThis & {
  __ALTERCADIA_OVERLAY_BRIDGE__?: OverlayBridge;
};

export function getOverlayBridge(): OverlayBridge {
  const globalOverlay = globalThis as GlobalWithOverlayBridge;
  if (!globalOverlay.__ALTERCADIA_OVERLAY_BRIDGE__) {
    globalOverlay.__ALTERCADIA_OVERLAY_BRIDGE__ = new OverlayBridge();
  }
  return globalOverlay.__ALTERCADIA_OVERLAY_BRIDGE__;
}
