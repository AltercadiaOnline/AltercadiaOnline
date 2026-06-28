import { isPhaserRenderEngineActive } from '../app/bridge/renderLayerBridge.js';
import type { MapTransitionPayload } from '../../shared/world/protocol.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  getMapInstanceSceneManager,
  type MapInstanceTransitionOptions,
} from './scenes/MapInstanceSceneManager.js';

/**
 * Coordena persistência local + troca de instância Phaser após handshake de portal.
 * O servidor persiste perfil em PortalTransitionGateway antes de `portal-transition-ready`.
 */
export function applyPhaserMapInstanceSwap(
  payload: MapTransitionPayload,
  options?: Pick<MapInstanceTransitionOptions, 'beforeTransition'>,
): boolean {
  if (!isPhaserRenderEngineActive()) return false;

  const manager = getMapInstanceSceneManager();
  if (!manager.isInitialized()) return false;

  return manager.transitionTo(payload.mapId as MapId, {
    ...(options?.beforeTransition ? { beforeTransition: options.beforeTransition } : {}),
    spawn: payload,
  });
}
