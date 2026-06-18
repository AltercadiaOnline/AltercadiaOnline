import type { WebSocket } from 'ws';
import type { ActionRequest } from '../../../shared/events.js';
import type { ClientIntent } from '../../../shared/intent/clientIntent.js';
import type { PlayerHonorGivenPayload } from '../../../shared/combat/playerHonorTypes.js';
import type { PortalTransitionRequestPayload } from '../../../shared/world/zoneTransition.js';
import type { WsInboundMessage } from '../../../shared/wsProtocol.js';
import type { CombatJoinSessionSyncInput } from '../../combat/applyCombatJoinSessionSync.js';
import type { LiveSocket, WorldConnectionState } from './wsConnectionTypes.js';

/** Superfície pública do CombatWsHub usada pelas rotas inbound WS. */
export type CombatWsRouteHost = {
  readonly worldConnections: ReadonlyMap<string, WorldConnectionState>;

  touchBattleSessionActivity(connectionId: string): void;

  handleJoin(
    ws: LiveSocket,
    connectionId: string,
    joinPayload?: CombatJoinSessionSyncInput & { readonly monsterInstanceId?: string },
    characterId?: number,
    worldPlayerId?: string,
  ): void;

  handleWorldLogin(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly serverId: string;
      readonly displayName?: string;
      readonly clientMapId?: string;
      readonly clientPosition?: { readonly x: number; readonly y: number };
      readonly accessToken?: string;
    },
  ): Promise<void>;

  handleRequestFullState(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly characterId: number },
  ): void;

  handlePlayerIntent(
    ws: LiveSocket,
    connectionId: string,
    payload: ClientIntent,
  ): Promise<void>;

  handleWorldChroniclesRequest(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly prioritizeAbsence?: boolean;
    },
  ): void;

  handlePositionSync(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly characterId: number;
      readonly currentMapId: string;
      readonly lastPosition: { readonly x: number; readonly y: number };
      readonly facing?: string;
      readonly reason?: 'heartbeat' | 'logout' | 'battle';
    },
  ): void;

  handlePortalTransitionRequest(
    ws: LiveSocket,
    connectionId: string,
    payload: PortalTransitionRequestPayload,
  ): void;

  handleChatGlobalSend(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly text: string;
    },
  ): void;

  handlePlayerHonorGiven(
    ws: LiveSocket,
    connectionId: string,
    payload: PlayerHonorGivenPayload,
  ): void;

  handleCollectLoot(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly lootId: string; readonly battleId: string },
  ): Promise<void>;

  routeCombatForfeit(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly battleId: string },
  ): Promise<void>;

  routeCombatAction(
    ws: LiveSocket,
    connectionId: string,
    payload: ActionRequest,
  ): Promise<void>;

  routeMirrorCombatAction(
    ws: LiveSocket,
    connectionId: string,
    payload: ActionRequest,
  ): Promise<void>;

  routeDevSpawnMirrorPlayer(
    ws: LiveSocket,
    connectionId: string,
  ): Promise<void>;

  routeCombatDismissLoot(payload: { readonly lootId: string }): void;

  getCombatSession(connectionId: string): import('../../combat/CombatSession.js').CombatSession | undefined;

  send(ws: WebSocket, message: import('../../../shared/wsProtocol.js').WsOutboundMessage): void;
};

export type WsInboundRouteHandler = (
  host: CombatWsRouteHost,
  ws: LiveSocket,
  connectionId: string,
  message: WsInboundMessage,
) => void | Promise<void>;

const routes = new Map<string, WsInboundRouteHandler>();

export function registerWsInboundRoute(
  type: string,
  handler: WsInboundRouteHandler,
): void {
  routes.set(type, handler);
}

export async function dispatchWsInboundMessage(
  host: CombatWsRouteHost,
  ws: LiveSocket,
  connectionId: string,
  message: WsInboundMessage,
): Promise<boolean> {
  const handler = routes.get(message.type);
  if (!handler) return false;
  await handler(host, ws, connectionId, message);
  return true;
}

export function getRegisteredWsInboundRouteTypes(): readonly string[] {
  return [...routes.keys()];
}
