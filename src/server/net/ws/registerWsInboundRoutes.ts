import {
  dispatchWsInboundMessage,
  registerWsInboundRoute,
  type CombatWsRouteHost,
} from './wsInboundRouter.js';
import type { LiveSocket } from './wsConnectionTypes.js';
import type { WsInboundMessage } from '../../../shared/wsProtocol.js';
import {
  handleWsRefractionBoothComplete,
  handleWsRefractionBoothQuote,
  handleWsRefractionBoothStart,
} from './wsRefractionMessageHandlers.js';

let routesRegistered = false;

function ensureWsInboundRoutesRegistered(): void {
  if (routesRegistered) return;

  registerWsInboundRoute('combat-join', (host, ws, connectionId, message) => {
    if (message.type !== 'combat-join') return;
    const world = host.worldConnections.get(connectionId);
    host.handleJoin(
      ws,
      connectionId,
      message.payload,
      world?.characterId ?? 1,
      world?.playerId,
    );
  });

  registerWsInboundRoute('world-login', async (host, ws, connectionId, message) => {
    if (message.type !== 'world-login') return;
    await host.handleWorldLogin(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('request-full-state', (host, ws, connectionId, message) => {
    if (message.type !== 'request-full-state') return;
    host.handleRequestFullState(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('player-intent', async (host, ws, connectionId, message) => {
    if (message.type !== 'player-intent') return;
    await host.handlePlayerIntent(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('world-chronicles-request', (host, ws, connectionId, message) => {
    if (message.type !== 'world-chronicles-request') return;
    host.handleWorldChroniclesRequest(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('position-sync', (host, ws, connectionId, message) => {
    if (message.type !== 'position-sync') return;
    host.handlePositionSync(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('portal-transition-request', (host, ws, connectionId, message) => {
    if (message.type !== 'portal-transition-request') return;
    host.handlePortalTransitionRequest(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('chat-global-send', (host, ws, connectionId, message) => {
    if (message.type !== 'chat-global-send') return;
    host.handleChatGlobalSend(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('refraction-booth-quote', (host, ws, connectionId, message) => {
    if (message.type !== 'refraction-booth-quote') return;
    handleWsRefractionBoothQuote(
      (socket, outbound) => host.send(socket, outbound),
      ws,
      host.worldConnections,
      connectionId,
      message.payload,
    );
  });

  registerWsInboundRoute('refraction-booth-start', async (host, ws, connectionId, message) => {
    if (message.type !== 'refraction-booth-start') return;
    await handleWsRefractionBoothStart(
      (socket, outbound) => host.send(socket, outbound),
      ws,
      host.worldConnections,
      connectionId,
      message.payload,
    );
  });

  registerWsInboundRoute('refraction-booth-complete', async (host, ws, connectionId, message) => {
    if (message.type !== 'refraction-booth-complete') return;
    await handleWsRefractionBoothComplete(
      (socket, outbound) => host.send(socket, outbound),
      ws,
      host.worldConnections,
      connectionId,
      message.payload,
    );
  });

  registerWsInboundRoute('player-honor-given', (host, ws, connectionId, message) => {
    if (message.type !== 'player-honor-given') return;
    host.handlePlayerHonorGiven(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('combat-forfeit', async (host, ws, connectionId, message) => {
    if (message.type !== 'combat-forfeit') return;
    await host.routeCombatForfeit(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('combat-collect-loot', async (host, ws, connectionId, message) => {
    if (message.type !== 'combat-collect-loot') return;
    await host.handleCollectLoot(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('combat-confirm-loot', async (host, ws, connectionId, message) => {
    if (message.type !== 'combat-confirm-loot') return;
    await host.handleCollectLoot(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('combat-dismiss-loot', (host, _ws, _connectionId, message) => {
    if (message.type !== 'combat-dismiss-loot') return;
    host.routeCombatDismissLoot(message.payload);
  });

  registerWsInboundRoute('dev-spawn-mirror-player', async (host, ws, connectionId) => {
    await host.routeDevSpawnMirrorPlayer(ws, connectionId);
  });

  registerWsInboundRoute('mirror-combat-action', async (host, ws, connectionId, message) => {
    if (message.type !== 'mirror-combat-action') return;
    await host.routeMirrorCombatAction(ws, connectionId, message.payload);
  });

  registerWsInboundRoute('combat-action', async (host, ws, connectionId, message) => {
    if (message.type !== 'combat-action') return;
    await host.routeCombatAction(ws, connectionId, message.payload);
  });

  routesRegistered = true;
}

export async function routeWsInboundMessage(
  host: CombatWsRouteHost,
  ws: LiveSocket,
  connectionId: string,
  message: WsInboundMessage,
): Promise<boolean> {
  ensureWsInboundRoutesRegistered();
  return dispatchWsInboundMessage(host, ws, connectionId, message);
}

/** @internal — exposto para testes de cobertura de rotas. */
export function resetWsInboundRoutesForTests(): void {
  routesRegistered = false;
}
