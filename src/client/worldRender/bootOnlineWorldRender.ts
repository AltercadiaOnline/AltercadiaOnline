// @ts-nocheck
import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { DEFAULT_MAP_ID } from '../../shared/world/mapRegistry.js';
import { ConstructWorldRuntime, isConstructLoadMapSupersededError, } from './construct/ConstructWorldRuntime.js';
import { bindExplorationWorldSync } from './bindExplorationWorldSync.js';
import { resolveWorldMountHost, revealWorldMountHost } from './worldRenderMount.js';
let activeEngine = null;
let bootPromise = null;
let teardownFrameSync = null;
/** world-login chegou antes/durante o boot — prioridade sobre DEFAULT_MAP_ID. */
let deferredAuthoritativeMap = null;
function markWorldRenderReady(scene = 'exploration') {
    getRenderLayerBridge().markWorldRenderBooted(true);
    getRenderLayerBridge().markWorldSceneReady(true);
    getRenderLayerBridge().markWorldEntitiesReady(true);
    getRenderLayerBridge().setActiveWorldScene(scene);
}
/**
 * Chamado por applyConstructMapLoad durante o boot — evita falha "mapa substituído".
 */
export function deferAuthoritativeConstructMap(mapId, spawn) {
    deferredAuthoritativeMap = spawn ? { mapId, spawn } : { mapId };
}
export function getWorldRenderEngine() {
    return activeEngine;
}
export function isWorldRenderBootInFlight() {
    return bootPromise !== null;
}
/**
 * Boot do motor de cena online — Construct 3 (único).
 * Phaser/Tiled removidos — Construct é o único motor de cena.
 */
export async function bootOnlineWorldRender(mapId = DEFAULT_MAP_ID) {
    if (bootPromise) {
        return bootPromise;
    }
    bootPromise = (async () => {
        try {
            const host = resolveWorldMountHost();
            if (!(host instanceof HTMLElement)) {
                console.error('[WorldRender] Host #world-mount-root ausente.');
                return false;
            }
            getRenderLayerBridge().setRenderEngine('construct');
            revealWorldMountHost();
            const engine = new ConstructWorldRuntime();
            await engine.boot(host);
            activeEngine = engine;
            teardownFrameSync?.();
            teardownFrameSync = bindExplorationWorldSync(engine);
            const authoritative = deferredAuthoritativeMap;
            deferredAuthoritativeMap = null;
            const bootMapId = authoritative?.mapId ?? mapId;
            await engine.loadMap(bootMapId, authoritative?.spawn ? { spawn: authoritative.spawn } : undefined);
            engine.setMode('exploration');
            markWorldRenderReady('exploration');
            console.info('[WorldRender] Construct pronto — exploration-frame ativo (batalha = canvas DOM; HUD React à parte).');
            return true;
        }
        catch (error) {
            const construct = activeEngine instanceof ConstructWorldRuntime ? activeEngine : null;
            const readyNow = construct?.getReadyMapId() ?? null;
            if (readyNow) {
                construct?.setMode('exploration');
                markWorldRenderReady('exploration');
                console.warn('[WorldRender] loadMap race recuperada — layout já pronto:', readyNow);
                return true;
            }
            if (construct && isConstructLoadMapSupersededError(error)) {
                try {
                    console.warn('[WorldRender] loadMap substituído durante boot — aguardando layout autoritativo…', error);
                    const readyMap = await construct.awaitActiveLayout();
                    if (readyMap) {
                        construct.setMode('exploration');
                        markWorldRenderReady('exploration');
                        console.warn('[WorldRender] loadMap race recuperada — layout pronto:', readyMap);
                        return true;
                    }
                }
                catch (waitError) {
                    console.error('[WorldRender] Falha ao recuperar layout após race:', waitError);
                }
            }
            console.error('[WorldRender] Falha ao iniciar Construct:', error);
            getRenderLayerBridge().markWorldRenderBooted(false);
            getRenderLayerBridge().markWorldSceneReady(false);
            return false;
        }
    })().finally(() => {
        bootPromise = null;
        deferredAuthoritativeMap = null;
    });
    return bootPromise;
}
export function setWorldRenderMode(mode) {
    const engine = activeEngine;
    if (!engine)
        return;
    engine.setMode(mode);
    getRenderLayerBridge().setActiveWorldScene(mode);
}
export function shutdownWorldRender() {
    teardownFrameSync?.();
    teardownFrameSync = null;
    activeEngine?.shutdown();
    activeEngine = null;
    deferredAuthoritativeMap = null;
    getRenderLayerBridge().markWorldRenderBooted(false);
    getRenderLayerBridge().markWorldSceneReady(false);
    getRenderLayerBridge().markWorldEntitiesReady(false);
    getRenderLayerBridge().setActiveWorldScene(null);
}
export function enableWorldRenderForOnlineSession() {
    getRenderLayerBridge().setRenderEngine('construct');
}
