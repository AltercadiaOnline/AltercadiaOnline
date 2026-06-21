import { getRenderLayerBridge } from './renderLayerBridge.js';

export type UiRuntimeMode = 'legacy-dom' | 'react-hybrid' | 'phaser-hybrid';

export type HudSurface = 'screen' | 'hud' | 'overlay';

export type GameUiBridgeSnapshot = {
  readonly mode: UiRuntimeMode;
  readonly mountedSurfaces: ReadonlySet<HudSurface>;
};

type GameUiBridgeListener = (snapshot: GameUiBridgeSnapshot) => void;

class GameUiBridge {
  private mode: UiRuntimeMode = 'legacy-dom';

  private readonly mountedSurfaces = new Set<HudSurface>();

  private readonly listeners = new Set<GameUiBridgeListener>();

  subscribe(listener: GameUiBridgeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  setMode(mode: UiRuntimeMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    getRenderLayerBridge().setUiRuntimeMode(mode);
    this.emit();
  }

  mountSurface(surface: HudSurface): void {
    if (this.mountedSurfaces.has(surface)) return;
    this.mountedSurfaces.add(surface);
    this.emit();
  }

  unmountSurface(surface: HudSurface): void {
    if (!this.mountedSurfaces.delete(surface)) return;
    this.emit();
  }

  snapshot(): GameUiBridgeSnapshot {
    return {
      mode: this.mode,
      mountedSurfaces: new Set(this.mountedSurfaces),
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

type GlobalWithGameUiBridge = typeof globalThis & {
  __ALTERCADIA_GAME_UI_BRIDGE__?: GameUiBridge;
};

export function getGameUiBridge(): GameUiBridge {
  const globalBridge = globalThis as GlobalWithGameUiBridge;
  if (!globalBridge.__ALTERCADIA_GAME_UI_BRIDGE__) {
    globalBridge.__ALTERCADIA_GAME_UI_BRIDGE__ = new GameUiBridge();
  }
  return globalBridge.__ALTERCADIA_GAME_UI_BRIDGE__;
}
