import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { isPreloaderReady } from './preloader/preloaderGate.js';
import { getMapInstanceSceneManager } from './scenes/MapInstanceSceneManager.js';

export type AltercadiaPhaserLoaderEntrySnapshot = {
  readonly key: string | null;
  readonly url: string | null;
  readonly state: number | string | null;
  readonly type: string | null;
};

export type AltercadiaPhaserSceneLoaderSnapshot = {
  readonly sceneKey: string;
  readonly active: boolean;
  readonly visible: boolean;
  readonly pending: readonly AltercadiaPhaserLoaderEntrySnapshot[];
  readonly inflight: number;
  readonly totalToLoad: number;
};

export type AltercadiaPhaserLoadingStatus = {
  readonly globalPending: readonly AltercadiaPhaserLoaderEntrySnapshot[];
  readonly globalInflight: number;
  readonly globalTotalToLoad: number;
  readonly scenes: readonly AltercadiaPhaserSceneLoaderSnapshot[];
};

export type AltercadiaPhaserBootSnapshot = {
  readonly preloaderReady: boolean;
  readonly activeMapId: string | null;
  readonly activeSceneKey: string | null;
  readonly renderLayer: ReturnType<ReturnType<typeof getRenderLayerBridge>['snapshot']>;
};

export type AltercadiaPhaserDebugHook = {
  readonly game: unknown;
  getActiveScene: () => unknown;
  getLoadingStatus: () => AltercadiaPhaserLoadingStatus;
  listScenes: () => readonly { readonly key: string; readonly active: boolean; readonly visible: boolean }[];
  getBootSnapshot: () => AltercadiaPhaserBootSnapshot;
};

type PhaserDebugGame = {
  readonly scene: {
    getScenes: (active?: boolean) => readonly unknown[];
  };
  readonly load?: PhaserDebugLoader;
};

type PhaserDebugLoader = {
  readonly list?: unknown;
  readonly inflight?: number;
  readonly totalToLoad?: number;
};

type PhaserDebugScene = {
  readonly scene: {
    readonly key: string;
    readonly isActive?: () => boolean;
    readonly isVisible?: () => boolean;
  };
  readonly load?: PhaserDebugLoader;
};

declare global {
  interface Window {
    __altercadia_debug?: AltercadiaPhaserDebugHook;
  }
}

function readNodeEnv(): string | undefined {
  try {
    return typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
  } catch {
    return undefined;
  }
}

/** Dev build ou `?phaserDebug=1` / `?altercadia_debug=1` na URL. */
export function isAltercadiaPhaserDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  if (readNodeEnv() === 'development') return true;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('phaserDebug') === '1' || params.get('altercadia_debug') === '1') {
      return true;
    }
  } catch {
    /* noop */
  }

  return false;
}

function normalizeLoaderEntries(list: unknown): AltercadiaPhaserLoaderEntrySnapshot[] {
  if (!list) return [];

  const rawEntries = (() => {
    if (Array.isArray(list)) return list;
    if (typeof list === 'object' && list !== null) {
      const record = list as { entries?: unknown; list?: unknown };
      if (Array.isArray(record.entries)) return record.entries;
      if (Array.isArray(record.list)) return record.list;
      return Object.values(record);
    }
    return [];
  })();

  return rawEntries.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      return { key: null, url: null, state: null, type: null };
    }
    const file = entry as {
      key?: string;
      url?: string;
      src?: string;
      state?: number | string;
      type?: string;
    };
    return {
      key: file.key ?? null,
      url: file.url ?? file.src ?? null,
      state: file.state ?? null,
      type: file.type ?? null,
    };
  });
}

function summarizeLoader(loader: PhaserDebugLoader | undefined): {
  readonly pending: readonly AltercadiaPhaserLoaderEntrySnapshot[];
  readonly inflight: number;
  readonly totalToLoad: number;
} {
  if (!loader) {
    return { pending: [], inflight: 0, totalToLoad: 0 };
  }

  return {
    pending: normalizeLoaderEntries(loader.list),
    inflight: Number(loader.inflight ?? 0),
    totalToLoad: Number(loader.totalToLoad ?? 0),
  };
}

function asDebugGame(game: unknown): PhaserDebugGame | null {
  if (!game || typeof game !== 'object') return null;
  const candidate = game as PhaserDebugGame;
  if (typeof candidate.scene?.getScenes !== 'function') return null;
  return candidate;
}

function asDebugScene(scene: unknown): PhaserDebugScene | null {
  if (!scene || typeof scene !== 'object') return null;
  const candidate = scene as PhaserDebugScene;
  if (typeof candidate.scene?.key !== 'string') return null;
  return candidate;
}

function buildLoadingStatus(game: PhaserDebugGame): AltercadiaPhaserLoadingStatus {
  const globalLoader = summarizeLoader(game.load);
  const scenes = game.scene.getScenes(false).map((rawScene) => {
    const scene = asDebugScene(rawScene);
    if (!scene) {
      return {
        sceneKey: '(unknown)',
        active: false,
        visible: false,
        pending: [],
        inflight: 0,
        totalToLoad: 0,
      };
    }

    const loader = summarizeLoader(scene.load);
    return {
      sceneKey: scene.scene.key,
      active: scene.scene.isActive?.() ?? false,
      visible: scene.scene.isVisible?.() ?? false,
      pending: loader.pending,
      inflight: loader.inflight,
      totalToLoad: loader.totalToLoad,
    };
  });

  return {
    globalPending: globalLoader.pending,
    globalInflight: globalLoader.inflight,
    globalTotalToLoad: globalLoader.totalToLoad,
    scenes,
  };
}

function buildSceneList(
  game: PhaserDebugGame,
): ReadonlyArray<{ readonly key: string; readonly active: boolean; readonly visible: boolean }> {
  return game.scene.getScenes(false).map((rawScene) => {
    const scene = asDebugScene(rawScene);
    if (!scene) {
      return { key: '(unknown)', active: false, visible: false };
    }
    return {
      key: scene.scene.key,
      active: scene.scene.isActive?.() ?? false,
      visible: scene.scene.isVisible?.() ?? false,
    };
  });
}

export function installAltercadiaPhaserDebugHook(game: unknown): void {
  if (!isAltercadiaPhaserDebugEnabled() || typeof window === 'undefined') return;

  const debugGame = asDebugGame(game);
  if (!debugGame) {
    console.warn('[PhaserDebug] Instância Phaser inválida — hook não instalado.');
    return;
  }

  const hook: AltercadiaPhaserDebugHook = {
    game,
    getActiveScene: () => debugGame.scene.getScenes(true)[0] ?? null,
    getLoadingStatus: () => buildLoadingStatus(debugGame),
    listScenes: () => buildSceneList(debugGame),
    getBootSnapshot: () => {
      const manager = getMapInstanceSceneManager();
      return {
        preloaderReady: isPreloaderReady(),
        activeMapId: manager.isInitialized() ? manager.getActiveMapId() : null,
        activeSceneKey: manager.isInitialized() ? manager.getActiveSceneKey() : null,
        renderLayer: getRenderLayerBridge().snapshot(),
      };
    },
  };

  window.__altercadia_debug = hook;
  console.info(
    '[PhaserDebug] window.__altercadia_debug instalado — '
    + 'use getActiveScene(), getLoadingStatus(), listScenes(), getBootSnapshot().',
  );
}

export function clearAltercadiaPhaserDebugHook(): void {
  if (typeof window === 'undefined') return;
  delete window.__altercadia_debug;
}
