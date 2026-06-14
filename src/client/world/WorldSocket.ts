import type {
  MapTransitionPayload,
  MoveIntent,
  PlayerPositionUpdate,
  PortalAccessDeniedPayload,
  PortalEnterIntent,
  RotateIntent,
} from '../../shared/world/protocol.js';
import type { PortalCollisionPayload } from '../../shared/world/portalConfirmation.js';

/** Contrato do canal de mundo — substituível por WebSocket/Socket.io real. */
export interface WorldSocket {
  emit(event: 'move', payload: MoveIntent): void;
  emit(event: 'rotate', payload: RotateIntent): void;
  emit(event: 'portal-enter', payload: PortalEnterIntent): void;
  on(event: 'player-update', handler: (payload: PlayerPositionUpdate) => void): () => void;
  on(event: 'map-transition', handler: (payload: MapTransitionPayload) => void): () => void;
  on(event: 'portal-access-denied', handler: (payload: PortalAccessDeniedPayload) => void): () => void;
  on(event: 'portal-collision', handler: (payload: PortalCollisionPayload) => void): () => void;
  getMapId(): string;
}
