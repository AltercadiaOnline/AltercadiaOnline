// @ts-nocheck
import { DEFAULT_MAP_ID, MAP_REGISTRY, } from '../../../shared/world/mapRegistry.js';
import { isMapInstanceSceneKey, resolveMapInstanceSceneKey, } from './mapInstanceSceneKeys.js';
import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';
import { PHASER_MAP_LOADING_SCENE_KEY, PHASER_PRELOADER_SCENE_KEY } from '../PhaserConfig.js';
import { revealPhaserMountHost } from '../phaserExplorationPipeline.js';
import { consumePendingMapLoading, isPreloaderReady, requestMapLoadingAfterPreloader, } from '../preloader/preloaderGate.js';
/**
 * Gerencia instâncias Phaser por mapa — isola memória parando a cena anterior ao entrar na nova.
 */
export class MapInstanceSceneManager {
    game = null;
    registeredMapIds = [];
    activeMapId = DEFAULT_MAP_ID;
    activeSceneKey = null;
    init(game, mapIds = Object.keys(MAP_REGISTRY)) {
        this.game = game;
        this.registeredMapIds = [...mapIds];
    }
    isInitialized() {
        return this.game !== null;
    }
    getActiveMapId() {
        return this.activeMapId;
    }
    getActiveSceneKey() {
        return this.activeSceneKey;
    }
    listRegisteredMapIds() {
        return this.registeredMapIds;
    }
    /**
     * Troca de instância — persiste estado, para cena atual e delega o carregamento à LoadingScene.
     */
    transitionTo(targetMapId, options) {
        if (!this.game) {
            console.warn('[MapInstanceSceneManager] Game Phaser não inicializado.');
            return false;
        }
        if (!this.registeredMapIds.includes(targetMapId)) {
            console.warn('[MapInstanceSceneManager] Mapa não registrado:', targetMapId);
            return false;
        }
        options?.beforeTransition?.();
        const targetSceneKey = resolveMapInstanceSceneKey(targetMapId);
        const activeScenes = this.game.scene.getScenes?.(true) ?? [];
        const targetSceneRunning = activeScenes.some((entry) => entry.scene.key === targetSceneKey);
        const loadingSceneRunning = activeScenes.some((entry) => entry.scene.key === PHASER_MAP_LOADING_SCENE_KEY);
        if (!options?.spawn) {
            if (loadingSceneRunning && targetMapId === this.activeMapId) {
                console.debug('[MapInstanceSceneManager] Carregamento do mapa já em andamento — ignorando transitionTo duplicado.');
                return true;
            }
            if (targetSceneRunning && targetMapId === this.activeMapId) {
                console.debug('[MapInstanceSceneManager] Instância do mapa já ativa — ignorando transitionTo duplicado.');
                return true;
            }
            if (targetSceneRunning
                && this.activeSceneKey === targetSceneKey) {
                return true;
            }
        }
        const currentSceneKey = this.resolveRunningSceneKey();
        const sourceMapId = this.activeMapId;
        if (currentSceneKey && currentSceneKey !== targetSceneKey) {
            this.game.scene.stop(currentSceneKey);
        }
        getRenderLayerBridge().markPhaserSceneReady(false);
        revealPhaserMountHost();
        const loadingData = {
            targetScene: targetSceneKey,
            targetMapId,
            sourceMapId: sourceMapId !== targetMapId ? sourceMapId : null,
            ...(options?.spawn ? { spawn: options.spawn } : {}),
        };
        requestMapLoadingAfterPreloader(loadingData);
        if (isPreloaderReady()) {
            consumePendingMapLoading();
            this.game.scene.start(PHASER_MAP_LOADING_SCENE_KEY, loadingData);
        }
        return true;
    }
    /** Chamado pela LoadingScene após 100% dos assets — confirma mapa ativo. */
    commitTransition(mapId, sceneKey) {
        this.activeMapId = mapId;
        this.activeSceneKey = sceneKey;
    }
    /** Primeira entrada no mundo — sem flush (login/spawn inicial). */
    bootDefaultMap(mapId = DEFAULT_MAP_ID) {
        return this.transitionTo(mapId);
    }
    /** Evita recarregar o mapa quando exploração já está ativa ou em LoadingScene. */
    isActiveMapLoadingOrRunning() {
        if (!this.game)
            return false;
        const targetSceneKey = resolveMapInstanceSceneKey(this.activeMapId);
        const activeScenes = this.game.scene.getScenes?.(true) ?? [];
        return activeScenes.some((entry) => entry.scene.key === PHASER_PRELOADER_SCENE_KEY
            || entry.scene.key === PHASER_MAP_LOADING_SCENE_KEY
            || entry.scene.key === targetSceneKey);
    }
    resolveRunningSceneKey() {
        if (this.activeSceneKey)
            return this.activeSceneKey;
        const scenes = this.game?.scene.getScenes?.(true);
        if (!scenes)
            return null;
        for (const entry of scenes) {
            const key = entry.scene.key;
            if (isMapInstanceSceneKey(key) || key === PHASER_MAP_LOADING_SCENE_KEY || key === PHASER_PRELOADER_SCENE_KEY) {
                return key;
            }
        }
        return null;
    }
}
let manager = null;
export function getMapInstanceSceneManager() {
    if (!manager) {
        manager = new MapInstanceSceneManager();
    }
    return manager;
}
export function resetMapInstanceSceneManager() {
    manager = null;
}
export function resolveActiveMapInstanceSceneKey() {
    return resolveMapInstanceSceneKey(getMapInstanceSceneManager().getActiveMapId());
}
