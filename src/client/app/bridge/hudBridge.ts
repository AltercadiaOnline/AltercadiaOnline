type HudBridgeListener = (snapshot: HudBridgeSnapshot) => void;

export type HudBridgeSnapshot = {
  readonly gameHudActive: boolean;
};

const DEFAULT_SNAPSHOT: HudBridgeSnapshot = {
  gameHudActive: false,
};

class HudBridge {
  private snapshotState: HudBridgeSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<HudBridgeListener>();

  subscribe(listener: HudBridgeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): HudBridgeSnapshot {
    return this.snapshotState;
  }

  setGameHudActive(gameHudActive: boolean): void {
    this.snapshotState = { ...this.snapshotState, gameHudActive };
    for (const listener of this.listeners) listener(this.snapshotState);
  }

  resetSession(): void {
    this.snapshotState = DEFAULT_SNAPSHOT;
    for (const listener of this.listeners) listener(this.snapshotState);
  }
}

type GlobalWithHudBridge = typeof globalThis & {
  __ALTERCADIA_HUD_BRIDGE__?: HudBridge;
};

export function getHudBridge(): HudBridge {
  const globalBridge = globalThis as GlobalWithHudBridge;
  if (!globalBridge.__ALTERCADIA_HUD_BRIDGE__) {
    globalBridge.__ALTERCADIA_HUD_BRIDGE__ = new HudBridge();
  }
  return globalBridge.__ALTERCADIA_HUD_BRIDGE__;
}
