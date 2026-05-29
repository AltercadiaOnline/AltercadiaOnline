import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { isOriginAllowed } from '../config/cors.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { parseWsInbound, serializeWsOutbound, type WsOutboundMessage } from '../../shared/wsProtocol.js';
import { CombatSession } from '../combat/CombatSession.js';
import { createDemoBattle } from '../combat/createDemoBattle.js';

type LiveSocket = WebSocket & { readonly sessionId?: string };

export type CombatWsHubOptions = {
  readonly corsOrigins: readonly string[];
};

export class CombatWsHub {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<string, CombatSession>();
  private readonly corsOrigins: readonly string[];

  constructor(server: import('node:http').Server, options: CombatWsHubOptions) {
    this.corsOrigins = options.corsOrigins;
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        const origin = info.origin;
        const requestHost = info.req.headers.host;
        if (isOriginAllowed(origin, this.corsOrigins, requestHost)) {
          callback(true);
          return;
        }
        console.warn('[WS] Origin bloqueado:', origin, 'host:', requestHost);
        callback(false, 403, 'Origin not allowed');
      },
    });
    this.wss.on('connection', (ws) => this.onConnection(ws as LiveSocket));
  }

  public close(): Promise<void> {
    for (const client of this.wss.clients) {
      client.close(1001, 'server_shutdown');
    }
    return new Promise((resolve, reject) => {
      this.wss.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private onConnection(ws: LiveSocket): void {
    const connectionId = randomUUID();
    console.log('[WS] Conexão', connectionId);

    ws.on('message', (raw) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      this.onMessage(ws, connectionId, text);
    });

    ws.on('close', () => {
      this.sessions.delete(connectionId);
      console.log('[WS] Desconectado', connectionId);
    });
  }

  private onMessage(ws: LiveSocket, connectionId: string, raw: string): void {
    const message = parseWsInbound(raw);
    if (!message) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_MESSAGE' } });
      return;
    }

    if (message.type === 'combat-join') {
      this.handleJoin(ws, connectionId, message.payload?.displayName);
      return;
    }

    if (message.type === 'combat-action') {
      const session = this.sessions.get(connectionId);
      if (!session) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
        return;
      }
      const result = session.dispatchPlayerAction(message.payload);
      if (!result.ok) {
        this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
        return;
      }
      this.sendCombatEvent(ws, result.payload);
    }
  }

  private handleJoin(ws: LiveSocket, connectionId: string, displayName?: string): void {
    const playerId = `player_${connectionId.slice(0, 8)}`;
    const session = new CombatSession(playerId, createDemoBattle(playerId, displayName ?? 'Operative'));
    this.sessions.set(connectionId, session);
    const payload = session.start();
    console.log('[WS] Batalha iniciada', {
      connectionId,
      playerId,
      battleId: payload.state.battleId,
    });
    this.sendCombatEvent(ws, payload);
  }

  private sendCombatEvent(ws: WebSocket, payload: CombatDispatchPayload): void {
    this.send(ws, { type: 'combat-event', payload });
  }

  private send(ws: WebSocket, message: WsOutboundMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(serializeWsOutbound(message));
    }
  }
}
