// @ts-nocheck
import { isPhaserRenderEngineActive } from '../app/bridge/renderLayerBridge.js';
import { getMapInstanceSceneManager, } from './scenes/MapInstanceSceneManager.js';
/**
 * Coordena persistência local + troca de instância Phaser após handshake de portal.
 * O servidor persiste perfil em PortalTransitionGateway antes de `portal-transition-ready`.
 */
export function applyPhaserMapInstanceSwap(payload, options) {
    if (!isPhaserRenderEngineActive())
        return false;
    const manager = getMapInstanceSceneManager();
    if (!manager.isInitialized())
        return false;
    return manager.transitionTo(payload.mapId, {
        ...(options?.beforeTransition ? { beforeTransition: options.beforeTransition } : {}),
        spawn: payload,
    });
}
