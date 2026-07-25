// @ts-nocheck
import { getRenderLayerBridge, } from '../app/bridge/renderLayerBridge.js';
import { deactivatePhaserExplorationPipeline, revealPhaserMountHost } from './phaserExplorationPipeline.js';
import { failTiledMapLoad } from './tiled/mapLoadFatalError.js';
import { buildPhaserGameConfig } from './buildPhaserGameConfig.js';
import { PHASER_BATTLE_SCENE_KEY, PHASER_MAP_LOADING_SCENE_KEY, PHASER_MOUNT_ROOT_ID, PHASER_PRELOADER_SCENE_KEY, } from './PhaserConfig.js';
import { DEFAULT_MAP_ID, MAP_REGISTRY } from '../../shared/world/mapRegistry.js';
import { resetCreatureAssetLoaderSession } from '../loaders/CreatureAssetLoader.js';
import { getMapInstanceSceneManager, resetMapInstanceSceneManager, } from './scenes/MapInstanceSceneManager.js';
import { createAllMapInstancePhaserScenes } from './scenes/ExplorationPhaserScene.js';
import { createLoadingPhaserScene } from './scenes/createLoadingPhaserScene.js';
import { createPreloaderPhaserScene } from './scenes/createPreloaderPhaserScene.js';
import { resetPreloaderGate } from './preloader/preloaderGate.js';
import { setPhaserRuntimeActive } from './phaserRuntimeState.js';
import { clearAltercadiaPhaserDebugHook, installAltercadiaPhaserDebugHook, } from './phaserDebugHook.js';
export { isPhaserRuntimeActive } from './phaserRuntimeState.js';
let activeGame = null;
let bootPromise = null;
function hidePhaserMountHost() {
    const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
    if (phaserHost) {
        phaserHost.classList.add('hidden');
        phaserHost.toggleAttribute('aria-hidden', true);
    }
}
function applyPhaserCanvasTransparency(host) {
    const canvas = host.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement))
        return;
    canvas.style.background = 'transparent';
}
/**
 * Boot Phaser sob demanda — import dinâmico; ativado no fluxo online (phaser-hybrid).
 */
export async function bootPhaserRuntime() {
    if (activeGame)
        return activeGame;
    if (bootPromise)
        return bootPromise;
    bootPromise = (async () => {
        const host = document.getElementById(PHASER_MOUNT_ROOT_ID);
        if (!(host instanceof HTMLElement)) {
            console.warn('[PhaserRuntime] Host Phaser ausente — abortando boot.');
            return null;
        }
        const PhaserNs = (await import('phaser'));
        const { createBattlePhaserScene } = await import('./scenes/BattlePhaserScene.js');
        const mapIds = Object.keys(MAP_REGISTRY);
        const mapInstanceScenes = createAllMapInstancePhaserScenes(PhaserNs, mapIds);
        const loadingScene = createLoadingPhaserScene(PhaserNs);
        const preloaderScene = createPreloaderPhaserScene(PhaserNs);
        revealPhaserMountHost();
        const gameConfig = buildPhaserGameConfig({
            Phaser: PhaserNs,
            parent: host,
            // Ordem canônica: PreloaderScene primeiro (auto-start), depois Loading → MapInstance (MainScene).
            scenes: [
                preloaderScene,
                loadingScene,
                ...mapInstanceScenes,
                createBattlePhaserScene(PhaserNs),
            ],
        });
        activeGame = new PhaserNs.Game(gameConfig);
        setPhaserRuntimeActive(true);
        applyPhaserCanvasTransparency(host);
        activeGame.scale?.refresh();
        const phaserVersion = PhaserNs.VERSION ?? 'unknown';
        console.info(`[PhaserRuntime] Phaser ${phaserVersion} — boot OK.`);
        getMapInstanceSceneManager().init(activeGame, mapIds);
        installAltercadiaPhaserDebugHook(activeGame);
        getRenderLayerBridge().markPhaserBooted(true);
        getRenderLayerBridge().markPhaserSceneReady(false);
        getRenderLayerBridge().setActivePhaserScene('exploration');
        return activeGame;
    })().catch((error) => {
        console.error('[PhaserRuntime] Falha ao iniciar Phaser:', error);
        setPhaserRuntimeActive(false);
        getRenderLayerBridge().markPhaserBooted(false);
        getRenderLayerBridge().markPhaserSceneReady(false);
        hidePhaserMountHost();
        const detail = error instanceof Error ? error.message : String(error);
        failTiledMapLoad(DEFAULT_MAP_ID, [
            'Phaser não iniciou — motor de render indisponível.',
            `Detalhe: ${detail}`,
        ]);
        return null;
    }).finally(() => {
        bootPromise = null;
    });
    return bootPromise;
}
export function shutdownPhaserRuntime() {
    clearAltercadiaPhaserDebugHook();
    if (activeGame) {
        activeGame.destroy(true);
        activeGame = null;
    }
    setPhaserRuntimeActive(false);
    resetMapInstanceSceneManager();
    resetPreloaderGate();
    resetCreatureAssetLoaderSession();
    deactivatePhaserExplorationPipeline();
    getRenderLayerBridge().markPhaserBooted(false);
    getRenderLayerBridge().markPhaserEntitiesReady(false);
    getRenderLayerBridge().setActivePhaserScene(null);
}
/** Troca cena ativa sem destruir o Game Phaser. Prontidão visual fica com cada cena. */
export function switchPhaserScene(sceneKey) {
    if (!activeGame)
        return;
    getRenderLayerBridge().markPhaserSceneReady(false);
    activeGame.scene.start(sceneKey);
    const activeScene = sceneKey === PHASER_BATTLE_SCENE_KEY
        ? 'battle'
        : sceneKey === PHASER_MAP_LOADING_SCENE_KEY
            || sceneKey === PHASER_PRELOADER_SCENE_KEY
            || sceneKey.startsWith('MapInstance:')
            ? 'exploration'
            : null;
    getRenderLayerBridge().setActivePhaserScene(activeScene);
}
/** Inicia a instância Phaser do mapa ativo via LoadingScene (assets antes da cena). */
export function switchPhaserToActiveMapInstance() {
    const manager = getMapInstanceSceneManager();
    if (!manager.isInitialized())
        return;
    manager.transitionTo(manager.getActiveMapId());
}
export async function ensurePhaserRuntimeForCurrentEngine() {
    const { renderEngine } = getRenderLayerBridge().snapshot();
    if (renderEngine !== 'phaser') {
        shutdownPhaserRuntime();
        return;
    }
    await bootPhaserRuntime();
}
