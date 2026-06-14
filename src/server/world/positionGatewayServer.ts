import { getOrCreatePlayerSession } from '../models/playerSessionRegistry.js';
import type { PositionGatewayServer } from './PositionGateway.js';

/** Host padrão — resolve Player via registry de sessão. */
export function createRegistryPositionGatewayServer(): PositionGatewayServer {
  return {
    getPlayer: getOrCreatePlayerSession,
  };
}
