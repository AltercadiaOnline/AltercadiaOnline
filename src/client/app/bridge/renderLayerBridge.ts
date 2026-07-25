import type { UiRuntimeMode } from '../types/uiSurfaces.js';

export type RenderEngine = 'construct';

export type ActiveWorldScene = 'exploration' | 'battle' | null;

export type RenderLayerSnapshot = {
  readonly renderEngine: RenderEngine;
  readonly worldRenderBooted: boolean;
  readonly worldSceneReady: boolean;
  readonly worldEntitiesReady: boolean;
  readonly activeWorldScene: ActiveWorldScene;
  readonly uiRuntimeMode: UiRuntimeMode;
};

type RenderLayerListener = (snapshot: RenderLayerSnapshot) => void;

class RenderLayerBridge {
  private renderEngine: RenderEngine = 'construct';

  private worldRenderBooted = false;

  private worldSceneReady = false;

  private worldEntitiesReady = false;

  private activeWorldScene: ActiveWorldScene = null;

  private uiRuntimeMode: UiRuntimeMode = 'online-react-v1';

  private readonly listeners = new Set<RenderLayerListener>();

  subscribe(listener: RenderLayerListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RenderLayerSnapshot {
    return {
      renderEngine: this.renderEngine,
      worldRenderBooted: this.worldRenderBooted,
      worldSceneReady: this.worldSceneReady,
      worldEntitiesReady: this.worldEntitiesReady,
      activeWorldScene: this.activeWorldScene,
      uiRuntimeMode: this.uiRuntimeMode,
    };
  }

  setUiRuntimeMode(mode: UiRuntimeMode): void {
    if (this.uiRuntimeMode === mode) return;
    this.uiRuntimeMode = mode;
    this.emit();
  }

  setRenderEngine(renderEngine: RenderEngine): void {
    if (this.renderEngine === renderEngine) return;
    this.renderEngine = renderEngine;
    this.emit();
  }

  markWorldRenderBooted(booted: boolean): void {
    if (this.worldRenderBooted === booted) return;
    this.worldRenderBooted = booted;
    this.emit();
  }

  markWorldSceneReady(ready: boolean): void {
    if (this.worldSceneReady === ready) return;
    this.worldSceneReady = ready;
    if (!ready) {
      this.worldEntitiesReady = false;
    }
    this.emit();
  }

  markWorldEntitiesReady(ready: boolean): void {
    if (this.worldEntitiesReady === ready) return;
    this.worldEntitiesReady = ready;
    this.emit();
  }

  setActiveWorldScene(scene: ActiveWorldScene): void {
    if (this.activeWorldScene === scene) return;
    this.activeWorldScene = scene;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.syncRenderHostDataset(snapshot.renderEngine);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private syncRenderHostDataset(renderEngine: RenderEngine): void {
    if (typeof document === 'undefined') return;
    const renderHost = document.getElementById('game-render-host');
    if (renderHost) {
      renderHost.dataset.renderEngine = renderEngine;
    }
  }
}

type GlobalWithRenderLayerBridge = typeof globalThis & {
  __ALTERCADIA_RENDER_LAYER_BRIDGE__?: RenderLayerBridge;
};

export function getRenderLayerBridge(): RenderLayerBridge {
  const globalBridge = globalThis as GlobalWithRenderLayerBridge;
  if (!globalBridge.__ALTERCADIA_RENDER_LAYER_BRIDGE__) {
    globalBridge.__ALTERCADIA_RENDER_LAYER_BRIDGE__ = new RenderLayerBridge();
  }
  return globalBridge.__ALTERCADIA_RENDER_LAYER_BRIDGE__;
}

export function isConstructRenderEngineActive(): boolean {
  return getRenderLayerBridge().snapshot().renderEngine === 'construct';
}

export function isWorldRenderPipelineReady(): boolean {
  const snap = getRenderLayerBridge().snapshot();
  return snap.renderEngine === 'construct' && snap.worldSceneReady;
}

export function isWorldExplorationEntitiesReady(): boolean {
  const snap = getRenderLayerBridge().snapshot();
  return snap.renderEngine === 'construct' && snap.worldEntitiesReady;
}

export function resolveRenderHostElement(): HTMLElement {
  const worldHost = document.getElementById('world-mount-root');
  if (worldHost instanceof HTMLElement) {
    return worldHost;
  }
  const renderHost = document.getElementById('game-render-host');
  if (renderHost instanceof HTMLElement) {
    return renderHost;
  }
  throw new Error('[render-layer] Host de renderização Construct indisponível');
}
