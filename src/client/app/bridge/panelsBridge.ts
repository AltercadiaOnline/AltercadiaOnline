import type { UiWindowId } from '../../ui/uiEvents.js';
import { useWorldPanelsStore } from '../store/worldPanelsStore.js';

type PanelsBridgeListener = (snapshot: PanelsBridgeSnapshot) => void;

export type PanelsBridgeSnapshot = {
  readonly openWindows: readonly UiWindowId[];
  readonly focusedWindow: UiWindowId | null;
  readonly hubOpen: boolean;
};

const DEFAULT_SNAPSHOT: PanelsBridgeSnapshot = {
  openWindows: [],
  focusedWindow: null,
  hubOpen: false,
};

function snapshotFromWorldPanelsStore(): PanelsBridgeSnapshot {
  const state = useWorldPanelsStore.getState();
  return {
    openWindows: state.openPanels.map((panel) => panel.windowId),
    focusedWindow: state.focusedWindowId,
    hubOpen: state.hubOpen,
  };
}

class PanelsBridge {
  private snapshotState: PanelsBridgeSnapshot = DEFAULT_SNAPSHOT;

  private gamePanelsActive = false;

  private readonly listeners = new Set<PanelsBridgeListener>();

  private worldPanelsUnsub: (() => void) | null = null;

  subscribe(listener: PanelsBridgeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): PanelsBridgeSnapshot {
    return this.snapshotState;
  }

  setGamePanelsActive(active: boolean): void {
    this.gamePanelsActive = active;
    if (active) {
      this.attachWorldPanelsSync();
    } else {
      this.detachWorldPanelsSync();
    }
  }

  setHubOpen(hubOpen: boolean): void {
    useWorldPanelsStore.getState().setHubOpen(hubOpen);
    this.syncFromStore();
  }

  notifyPanelOpened(windowId: UiWindowId): void {
    if (windowId === 'hub') {
      useWorldPanelsStore.getState().setHubOpen(true);
    } else {
      useWorldPanelsStore.getState().openPanel(windowId);
    }
    this.syncFromStore();
  }

  notifyPanelClosed(windowId: UiWindowId): void {
    useWorldPanelsStore.getState().closePanel(windowId);
    this.syncFromStore();
  }

  notifyPanelFocused(windowId: UiWindowId): void {
    useWorldPanelsStore.getState().focusPanel(windowId);
    this.syncFromStore();
  }

  isGamePanelsActive(): boolean {
    return this.gamePanelsActive;
  }

  private attachWorldPanelsSync(): void {
    if (this.worldPanelsUnsub) return;
    this.worldPanelsUnsub = useWorldPanelsStore.subscribe(() => {
      this.syncFromStore();
    });
    this.syncFromStore();
  }

  private detachWorldPanelsSync(): void {
    this.worldPanelsUnsub?.();
    this.worldPanelsUnsub = null;
  }

  private syncFromStore(): void {
    this.snapshotState = snapshotFromWorldPanelsStore();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshotState);
    }
  }
}

type GlobalWithPanelsBridge = typeof globalThis & {
  __ALTERCADIA_PANELS_BRIDGE__?: PanelsBridge;
};

export function getPanelsBridge(): PanelsBridge {
  const globalBridge = globalThis as GlobalWithPanelsBridge;
  if (!globalBridge.__ALTERCADIA_PANELS_BRIDGE__) {
    globalBridge.__ALTERCADIA_PANELS_BRIDGE__ = new PanelsBridge();
  }
  return globalBridge.__ALTERCADIA_PANELS_BRIDGE__;
}

export function isReactGamePanelsEnabled(): boolean {
  return document.body.dataset.reactGameHudUi === '1';
}
