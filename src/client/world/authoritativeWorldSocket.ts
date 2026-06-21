import type {
  MapTransitionPayload,
  MoveIntent,
  PlayerPositionUpdate,
  PortalAccessDeniedPayload,
  PortalEnterIntent,
  RotateIntent,
} from '../../shared/world/protocol.js';
import type { MovePlayerIntentPayload, RotatePlayerIntentPayload } from '../../shared/world/movementIntent.js';
import type { PortalCollisionPayload } from '../../shared/world/portalConfirmation.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import {
  createMockWorldSocket,
  type MockWorldSocket,
} from '../services/mockWorldSocket.js';
import type { WorldSocket } from './WorldSocket.js';
import { getWorldMovementAuthority } from './worldMovementAuthority.js';

export type MoveIntentTransport = (payload: MovePlayerIntentPayload) => void;
export type RotateIntentTransport = (payload: RotatePlayerIntentPayload) => void;

export type WorldExplorationIntentTransport = {
  readonly onMove: MoveIntentTransport;
  readonly onRotate: RotateIntentTransport;
};

type PlayerUpdateHandler = (payload: PlayerPositionUpdate) => void;
type MapTransitionHandler = (payload: MapTransitionPayload) => void;
type PortalAccessDeniedHandler = (payload: PortalAccessDeniedPayload) => void;
type PortalCollisionHandler = (payload: PortalCollisionPayload) => void;

export type AuthoritativeWorldSocket = WorldSocket & MockWorldSocket & {
  setOnlineMode(enabled: boolean, transport?: WorldExplorationIntentTransport): void;
  seedPredictedPosition(position: { readonly x: number; readonly y: number }): void;
  removeAllListeners(): void;
};

/**
 * WorldSocket híbrido — mock offline; online envia intenções MOVE sem mutar posição local.
 */
export function createAuthoritativeWorldSocket(
  initialMapId: Parameters<typeof createMockWorldSocket>[0],
): AuthoritativeWorldSocket {
  const mock = createMockWorldSocket(initialMapId);
  const updateHandlers = new Set<PlayerUpdateHandler>();
  const transitionHandlers = new Set<MapTransitionHandler>();
  const deniedHandlers = new Set<PortalAccessDeniedHandler>();
  const collisionHandlers = new Set<PortalCollisionHandler>();

  let online = false;
  let transport: WorldExplorationIntentTransport | null = null;
  let localSeq = 0;
  let localRotateSeq = 0;
  let predictedTileX = 0;
  let predictedTileY = 0;

  const authority = getWorldMovementAuthority();
  let authorityUnsub = authority.subscribe((payload) => {
    const tile = worldPixelToTile(payload.x, payload.y);
    predictedTileX = tile.tileX;
    predictedTileY = tile.tileY;
    for (const handler of updateHandlers) {
      handler(payload);
    }
  });

  mock.on('player-update', (payload) => {
    if (online) return;
    for (const handler of updateHandlers) {
      handler(payload);
    }
  });

  mock.on('map-transition', (payload) => {
    for (const handler of transitionHandlers) {
      handler(payload);
    }
  });

  mock.on('portal-access-denied', (payload) => {
    for (const handler of deniedHandlers) {
      handler(payload);
    }
  });

  mock.on('portal-collision', (payload) => {
    for (const handler of collisionHandlers) {
      handler(payload);
    }
  });

  const emitMove = (payload: MoveIntent): void => {
    if (online) {
      if (!transport) return;
      const stepX = Math.sign(payload.stepX) as -1 | 0 | 1;
      const stepY = Math.sign(payload.stepY) as -1 | 0 | 1;
      if (stepX === 0 && stepY === 0) return;

      const targetX = predictedTileX + stepX;
      const targetY = predictedTileY + stepY;
      const seq = ++localSeq;

      transport.onMove({ targetX, targetY, seq });
      return;
    }
    mock.emit('move', payload);
  };

  const emitRotate = (payload: RotateIntent): void => {
    if (online) {
      if (!transport) return;
      const seq = ++localRotateSeq;
      transport.onRotate({ direction: payload.direction, seq });
      return;
    }
    mock.emit('rotate', payload);
  };

  const emit: WorldSocket['emit'] = (
    event: 'move' | 'rotate' | 'portal-enter',
    payload: MoveIntent | RotateIntent | PortalEnterIntent,
  ): void => {
    if (event === 'move') {
      emitMove(payload as MoveIntent);
      return;
    }
    if (event === 'rotate') {
      emitRotate(payload as RotateIntent);
      return;
    }
    mock.emit('portal-enter', payload as PortalEnterIntent);
  };

  const on: WorldSocket['on'] = (
    event: 'player-update' | 'map-transition' | 'portal-access-denied' | 'portal-collision',
    handler:
      | PlayerUpdateHandler
      | MapTransitionHandler
      | PortalAccessDeniedHandler
      | PortalCollisionHandler,
  ): (() => void) => {
    if (event === 'player-update') {
      const updateHandler = handler as PlayerUpdateHandler;
      updateHandlers.add(updateHandler);
      return () => updateHandlers.delete(updateHandler);
    }
    if (event === 'map-transition') {
      const transitionHandler = handler as MapTransitionHandler;
      transitionHandlers.add(transitionHandler);
      return () => transitionHandlers.delete(transitionHandler);
    }
    if (event === 'portal-access-denied') {
      const deniedHandler = handler as PortalAccessDeniedHandler;
      deniedHandlers.add(deniedHandler);
      return () => deniedHandlers.delete(deniedHandler);
    }
    const collisionHandler = handler as PortalCollisionHandler;
    collisionHandlers.add(collisionHandler);
    return () => collisionHandlers.delete(collisionHandler);
  };

  const socket: AuthoritativeWorldSocket = {
    ...mock,

    setOnlineMode(enabled: boolean, nextTransport?: WorldExplorationIntentTransport): void {
      online = enabled;
      transport = enabled ? (nextTransport ?? null) : null;
      if (!enabled) {
        localRotateSeq = 0;
      }
      authority.setOnlineMode(enabled);
    },

    seedPredictedPosition(position: { readonly x: number; readonly y: number }): void {
      const tile = worldPixelToTile(position.x, position.y);
      predictedTileX = tile.tileX;
      predictedTileY = tile.tileY;
    },

    emit,

    on,

    applyServerWorldState(
      profile: Parameters<MockWorldSocket['applyServerWorldState']>[0],
      options?: Parameters<MockWorldSocket['applyServerWorldState']>[1],
    ): void {
      mock.applyServerWorldState(profile, options);
      const tile = worldPixelToTile(profile.lastPosition.x, profile.lastPosition.y);
      predictedTileX = tile.tileX;
      predictedTileY = tile.tileY;
    },

    removeAllListeners(): void {
      updateHandlers.clear();
      transitionHandlers.clear();
      deniedHandlers.clear();
      collisionHandlers.clear();
      authorityUnsub?.();
      authorityUnsub = () => undefined;
    },
  };

  return socket;
}

export function isAuthoritativeWorldSocket(
  value: WorldSocket | null | undefined,
): value is AuthoritativeWorldSocket {
  return value !== null
    && value !== undefined
    && 'setOnlineMode' in value
    && typeof (value as AuthoritativeWorldSocket).setOnlineMode === 'function';
}
