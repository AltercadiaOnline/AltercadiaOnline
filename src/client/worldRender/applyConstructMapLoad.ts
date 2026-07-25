import { isConstructRenderEngineActive } from '../app/bridge/renderLayerBridge.js';
import type { MapTransitionPayload } from '../../shared/world/protocol.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  deferAuthoritativeConstructMap,
  getWorldRenderEngine,
  isWorldRenderBootInFlight,
} from './bootOnlineWorldRender.js';

/**
 * Após handshake de portal / respawn — pede ao Construct carregar o layout do mapa
 * com âncora de spawn (autoridade continua no servidor / Exploration).
 */
export function applyConstructMapLoad(payload: MapTransitionPayload): boolean {
  const mapId = payload.mapId as MapId;
  const spawn = {
    x: payload.x,
    y: payload.y,
    ...(payload.facing ? { facing: payload.facing } : {}),
  };

  // world-login pode chegar antes do engine existir ou no meio do boot.
  if (isWorldRenderBootInFlight() || !getWorldRenderEngine()) {
    deferAuthoritativeConstructMap(mapId, spawn);
  }

  if (!isConstructRenderEngineActive()) return false;
  const engine = getWorldRenderEngine();
  if (!engine) return true;

  void engine.loadMap(mapId, { spawn });
  return true;
}
