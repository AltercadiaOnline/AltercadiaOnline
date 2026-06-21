import type { UiRuntimeMode } from '../types/uiSurfaces.js';

export type RenderEngine = 'canvas-legacy' | 'phaser';

export type ActivePhaserScene = 'exploration' | 'battle' | null;

export type RenderLayerSnapshot = {
  readonly renderEngine: RenderEngine;
  readonly phaserBooted: boolean;
  readonly phaserSceneReady: boolean;
  readonly activePhaserScene: ActivePhaserScene;
  readonly uiRuntimeMode: UiRuntimeMode;
};

type RenderLayerListener = (snapshot: RenderLayerSnapshot) => void;

class RenderLayerBridge {
  private renderEngine: RenderEngine = 'canvas-legacy';

  private phaserBooted = false;

  private phaserSceneReady = false;

  private activePhaserScene: ActivePhaserScene = null;

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
      phaserBooted: this.phaserBooted,
      phaserSceneReady: this.phaserSceneReady,
      activePhaserScene: this.activePhaserScene,
      uiRuntimeMode: this.uiRuntimeMode,
    };
  }

  setUiRuntimeMode(mode: UiRuntimeMode): void {
    if (this.uiRuntimeMode === mode) return;
    this.uiRuntimeMode = mode;
    this.renderEngine = mode === 'phaser-v1' ? 'phaser' : 'canvas-legacy';
    this.emit();
  }

  setRenderEngine(renderEngine: RenderEngine): void {
    if (this.renderEngine === renderEngine) return;
    this.renderEngine = renderEngine;
    this.emit();
  }

  markPhaserBooted(booted: boolean): void {
    if (this.phaserBooted === booted) return;
    this.phaserBooted = booted;
    this.emit();
  }

  markPhaserSceneReady(ready: boolean): void {
    if (this.phaserSceneReady === ready) return;
    this.phaserSceneReady = ready;
    this.emit();
  }

  setActivePhaserScene(scene: ActivePhaserScene): void {
    if (this.activePhaserScene === scene) return;
    this.activePhaserScene = scene;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    void import('../../phaser/phaserBattleArenaDom.js').then(({ syncPhaserBattleArenaDomVisibility }) => {
      syncPhaserBattleArenaDomVisibility();
    });
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

export function isPhaserRenderEngineActive(): boolean {
  return getRenderLayerBridge().snapshot().renderEngine === 'phaser';
}

export function resolveRenderHostElement(): HTMLElement {
  const bridge = getRenderLayerBridge();
  const phaserHost = document.getElementById('phaser-mount-root');
  const canvas = document.getElementById('game-canvas');
  if (bridge.snapshot().renderEngine === 'phaser' && phaserHost) {
    return phaserHost;
  }
  if (canvas instanceof HTMLElement) {
    return canvas;
  }
  throw new Error('[render-layer] Host de renderização indisponível');
}
