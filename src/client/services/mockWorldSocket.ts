import { snapWorldToTileCenter, tryGridStep } from '../../shared/world/gridMovement.js';
import { moveDirectionToFacing, moveVectorToFacing } from '../../shared/world/playerFacing.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
import type {
  MapTransitionPayload,
  MoveIntent,
  PlayerPositionUpdate,
  PortalAccessDeniedPayload,
  PortalEnterIntent,
  RotateIntent,
} from '../../shared/world/protocol.js';
import {
  DEFAULT_MAP_ID,
  getMapDefinition,
  type MapDefinition,
  type MapId,
} from '../../shared/world/mapRegistry.js';
import {
  buildPortalTransitionPayload,
  checkPortal,
} from '../../shared/world/portals.js';
import { isWithinInteractionRadius } from '../../shared/world/interactableDistance.js';
import {
  portalReferenceTile,
  validatePortalAccess,
} from '../../shared/world/portalAccess.js';
import type { PortalCollisionPayload } from '../../shared/world/portalConfirmation.js';
import type { WorldSocket } from '../world/WorldSocket.js';

type PlayerUpdateHandler = (payload: PlayerPositionUpdate) => void;
type MapTransitionHandler = (payload: MapTransitionPayload) => void;
type PortalAccessDeniedHandler = (payload: PortalAccessDeniedPayload) => void;
type PortalCollisionHandler = (payload: PortalCollisionPayload) => void;

export type MockWorldSocket = WorldSocket & {
  setPlayerLevel(level: number): void;
  setPlayerPosition(x: number, y: number, facing?: PlayerPositionUpdate['facing']): void;
  getPlayerSnapshot(): PlayerPositionUpdate;
  applyServerWorldState(profile: {
    readonly currentMapId: string;
    readonly lastPosition: { readonly x: number; readonly y: number };
    readonly facing: PlayerPositionUpdate['facing'];
  }, options?: { readonly silent?: boolean }): void;
};

/** Simula a autoridade do servidor até o WebSocket real estar pronto. */
export function createMockWorldSocket(initialMapId: MapId = DEFAULT_MAP_ID): MockWorldSocket {
  let mapId: MapId = initialMapId;
  let mapDef: MapDefinition = getMapDefinition(mapId)!;
  let mapData = mapDef.generateData();
  let playerLevel = 1;

  const spawnTileX = Math.floor((mapDef.pixelWidth() / 2) / mapDef.tileSize);
  const spawnTileY = Math.floor((mapDef.pixelHeight() / 2) / mapDef.tileSize);
  const spawnCenter = tileCenterToWorldPixel(spawnTileX, spawnTileY);
  let serverTileX = spawnTileX;
  let serverTileY = spawnTileY;
  const player = {
    x: spawnCenter.x,
    y: spawnCenter.y,
    facing: moveDirectionToFacing('down'),
  };

  const updateHandlers = new Set<PlayerUpdateHandler>();
  const transitionHandlers = new Set<MapTransitionHandler>();
  const deniedHandlers = new Set<PortalAccessDeniedHandler>();
  const collisionHandlers = new Set<PortalCollisionHandler>();
  let standingPortalId: string | null = null;

  const publishUpdate = (): void => {
    const snapshot: PlayerPositionUpdate = {
      x: player.x,
      y: player.y,
      facing: player.facing,
      mapId,
    };
    for (const handler of updateHandlers) {
      handler(snapshot);
    }
  };

  const publishTransition = (payload: MapTransitionPayload): void => {
    for (const handler of transitionHandlers) {
      handler(payload);
    }
  };

  const publishDenied = (payload: PortalAccessDeniedPayload): void => {
    for (const handler of deniedHandlers) {
      handler(payload);
    }
  };

  const applyMapTransition = (payload: MapTransitionPayload): void => {
    const nextDef = getMapDefinition(payload.mapId);
    if (!nextDef) return;

    mapId = payload.mapId as MapId;
    mapDef = nextDef;
    mapData = mapDef.generateData();
    player.x = payload.x;
    player.y = payload.y;
    const tile = worldPixelToTile(payload.x, payload.y);
    serverTileX = tile.tileX;
    serverTileY = tile.tileY;
    standingPortalId = null;
    if (payload.facing) {
      player.facing = payload.facing;
    }
  };

  const publishCollision = (payload: PortalCollisionPayload): void => {
    for (const handler of collisionHandlers) {
      handler(payload);
    }
  };

  const detectPortalCollision = (): void => {
    const portal = checkPortal(mapDef.portals, player.x, player.y);
    if (!portal) {
      standingPortalId = null;
      return;
    }

    if (standingPortalId === portal.id) return;

    standingPortalId = portal.id;
    publishCollision({ portalId: portal.id });
  };

  const canEnterPortal = (portalId: string): boolean => {
    const portal = mapDef.portals.find((entry) => entry.id === portalId);
    if (!portal) return false;

    const onPortal = checkPortal(mapDef.portals, player.x, player.y);
    if (onPortal?.id === portalId) return true;

    const reference = portalReferenceTile(portal);
    return isWithinInteractionRadius(player.x, player.y, reference);
  };

  publishUpdate();

  return {
    emit(
      event: 'move' | 'rotate' | 'portal-enter',
      payload: MoveIntent | RotateIntent | PortalEnterIntent,
    ): void {
      if (event === 'portal-enter') {
        const enterPayload = payload as PortalEnterIntent;
        const portal = mapDef.portals.find((entry) => entry.id === enterPayload.portalId);
        if (!portal) return;

        if (!canEnterPortal(portal.id)) {
          publishDenied({
            portalId: portal.id,
            reason: 'Aproxime-se do portal (1,5 tiles).',
          });
          return;
        }

        const access = validatePortalAccess(portal, playerLevel);
        if (!access.ok) {
          publishDenied({ portalId: portal.id, reason: access.reason });
          return;
        }

        const transitionPayload = buildPortalTransitionPayload(portal, mapId, player.facing);
        applyMapTransition(transitionPayload);
        publishTransition(transitionPayload);
        publishUpdate();
        return;
      }

      if (event === 'rotate') {
        const rotatePayload = payload as RotateIntent;
        player.facing = moveDirectionToFacing(rotatePayload.direction);
        publishUpdate();
        return;
      }

      if (event !== 'move') return;

      const movePayload = payload as MoveIntent;
      const step = {
        stepX: movePayload.stepX,
        stepY: movePayload.stepY,
      };
      const origin = tileCenterToWorldPixel(serverTileX, serverTileY);
      const next = tryGridStep(origin, step, mapData);
      if (!next) return;

      const nextTile = worldPixelToTile(next.x, next.y);
      serverTileX = nextTile.tileX;
      serverTileY = nextTile.tileY;
      player.x = next.x;
      player.y = next.y;
      player.facing = moveVectorToFacing(step.stepX, step.stepY);
      detectPortalCollision();
    },

    on(
      event: 'player-update' | 'map-transition' | 'portal-access-denied' | 'portal-collision',
      handler:
        | PlayerUpdateHandler
        | MapTransitionHandler
        | PortalAccessDeniedHandler
        | PortalCollisionHandler,
    ): () => void {
      if (event === 'player-update') {
        const updateHandler = handler as PlayerUpdateHandler;
        updateHandlers.add(updateHandler);
        updateHandler({
          x: player.x,
          y: player.y,
          facing: player.facing,
          mapId,
        });
        return () => {
          updateHandlers.delete(updateHandler);
        };
      }

      if (event === 'portal-access-denied') {
        const deniedHandler = handler as PortalAccessDeniedHandler;
        deniedHandlers.add(deniedHandler);
        return () => {
          deniedHandlers.delete(deniedHandler);
        };
      }

      if (event === 'portal-collision') {
        const collisionHandler = handler as PortalCollisionHandler;
        collisionHandlers.add(collisionHandler);
        return () => {
          collisionHandlers.delete(collisionHandler);
        };
      }

      const transitionHandler = handler as MapTransitionHandler;
      transitionHandlers.add(transitionHandler);
      return () => {
        transitionHandlers.delete(transitionHandler);
      };
    },

    getMapId(): string {
      return mapId;
    },

    setPlayerLevel(level: number): void {
      playerLevel = level;
    },

    setPlayerPosition(x: number, y: number, facing?: PlayerPositionUpdate['facing']): void {
      const snapped = snapWorldToTileCenter(x, y);
      player.x = snapped.x;
      player.y = snapped.y;
      if (facing) {
        player.facing = facing;
      }
      publishUpdate();
      detectPortalCollision();
    },

    getPlayerSnapshot(): PlayerPositionUpdate {
      return {
        x: player.x,
        y: player.y,
        facing: player.facing,
        mapId,
      };
    },

  applyServerWorldState(
    profile: {
      readonly currentMapId: string;
      readonly lastPosition: { readonly x: number; readonly y: number };
      readonly facing: PlayerPositionUpdate['facing'];
    },
    options?: { readonly silent?: boolean },
  ): void {
    const nextMapId = profile.currentMapId as MapId;
    const nextDef = getMapDefinition(nextMapId);
    if (!nextDef) return;

    mapId = nextMapId;
    mapDef = nextDef;
    mapData = mapDef.generateData();
    player.x = profile.lastPosition.x;
    player.y = profile.lastPosition.y;
    player.facing = profile.facing ?? player.facing;
    const tile = worldPixelToTile(player.x, player.y);
    serverTileX = tile.tileX;
    serverTileY = tile.tileY;
    standingPortalId = null;
    if (!options?.silent) {
      publishUpdate();
      detectPortalCollision();
    }
  },
  };
}
