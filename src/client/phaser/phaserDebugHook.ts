// @ts-nocheck
import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { isPreloaderReady } from './preloader/preloaderGate.js';
import { getMapInstanceSceneManager } from './scenes/MapInstanceSceneManager.js';
function readNodeEnv() {
    try {
        return typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
    }
    catch {
        return undefined;
    }
}
/** Dev build ou `?phaserDebug=1` / `?altercadia_debug=1` na URL. */
export function isAltercadiaPhaserDebugEnabled() {
    if (typeof window === 'undefined')
        return false;
    if (readNodeEnv() === 'development')
        return true;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('phaserDebug') === '1' || params.get('altercadia_debug') === '1') {
            return true;
        }
    }
    catch {
        /* noop */
    }
    return false;
}
function normalizeLoaderEntries(list) {
    if (!list)
        return [];
    const rawEntries = (() => {
        if (Array.isArray(list))
            return list;
        if (typeof list === 'object' && list !== null) {
            const record = list;
            if (Array.isArray(record.entries))
                return record.entries;
            if (Array.isArray(record.list))
                return record.list;
            return Object.values(record);
        }
        return [];
    })();
    return rawEntries.map((entry) => {
        if (!entry || typeof entry !== 'object') {
            return { key: null, url: null, state: null, type: null };
        }
        const file = entry;
        return {
            key: file.key ?? null,
            url: file.url ?? file.src ?? null,
            state: file.state ?? null,
            type: file.type ?? null,
        };
    });
}
function summarizeLoader(loader) {
    if (!loader) {
        return { pending: [], inflight: 0, totalToLoad: 0 };
    }
    return {
        pending: normalizeLoaderEntries(loader.list),
        inflight: Number(loader.inflight ?? 0),
        totalToLoad: Number(loader.totalToLoad ?? 0),
    };
}
function asDebugGame(game) {
    if (!game || typeof game !== 'object')
        return null;
    const candidate = game;
    if (typeof candidate.scene?.getScenes !== 'function')
        return null;
    return candidate;
}
function asDebugScene(scene) {
    if (!scene || typeof scene !== 'object')
        return null;
    const candidate = scene;
    if (typeof candidate.scene?.key !== 'string')
        return null;
    return candidate;
}
function buildLoadingStatus(game) {
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
function buildSceneList(game) {
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
export function installAltercadiaPhaserDebugHook(game) {
    if (!isAltercadiaPhaserDebugEnabled() || typeof window === 'undefined')
        return;
    const debugGame = asDebugGame(game);
    if (!debugGame) {
        console.warn('[PhaserDebug] Instância Phaser inválida — hook não instalado.');
        return;
    }
    const hook = {
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
    console.info('[PhaserDebug] window.__altercadia_debug instalado — '
        + 'use getActiveScene(), getLoadingStatus(), listScenes(), getBootSnapshot().');
}
export function clearAltercadiaPhaserDebugHook() {
    if (typeof window === 'undefined')
        return;
    delete window.__altercadia_debug;
}
