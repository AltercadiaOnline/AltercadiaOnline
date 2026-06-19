import type { ExplorationSnapshot } from '../../shared/game/gameState.js';

import type { PositionSyncReason } from '../../shared/world/playerWorldProfile.js';

import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';

import { getActionDispatcher } from '../ActionDispatcher.js';
import { resolveSessionAccessToken } from '../auth/supabaseAuth.js';
import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED } from '../../shared/supabase/characterServerScope.js';

const HEARTBEAT_MS = 5000;

export type PositionGatewayCredentials = {

  readonly playerId: string;

  readonly characterId: number;

  readonly displayName?: string;

};



export type PositionGatewayOptions = {

  readonly socket: BrowserCombatSocket | null;

  readonly getCredentials: () => PositionGatewayCredentials | null;

  readonly captureSnapshot: () => ExplorationSnapshot;

  /** Só envia position-sync em exploração top-down (EXPLORATION). */

  readonly isExploration: () => boolean;

  /** Chamado quando world-login não pode ser enviado (JWT ausente, shard inválido, etc.). */
  readonly onWorldLoginBlocked?: (reason: string) => void;

};

/**
 * Sincronização legada de posição — online usa MOVE_INTENT + state-sync tick.
 * Offline: heartbeat opcional apenas em EXPLORATION.
 */
export class PositionGateway {

  private socket: BrowserCombatSocket | null;

  private readonly getCredentials: PositionGatewayOptions['getCredentials'];

  private readonly captureSnapshot: PositionGatewayOptions['captureSnapshot'];

  private readonly isExploration: PositionGatewayOptions['isExploration'];

  private readonly onWorldLoginBlocked: PositionGatewayOptions['onWorldLoginBlocked'];

  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;



  constructor(options: PositionGatewayOptions) {

    this.socket = options.socket;

    this.getCredentials = options.getCredentials;

    this.captureSnapshot = options.captureSnapshot;

    this.isExploration = options.isExploration;

    this.onWorldLoginBlocked = options.onWorldLoginBlocked;

  }



  bindSocket(socket: BrowserCombatSocket): void {

    this.socket = socket;

  }



  async requestWorldLogin(clientPositionIgnored?: ExplorationSnapshot): Promise<void> {
    const creds = this.getCredentials();

    if (!creds || !this.socket) {
      console.warn('[PositionGateway] world-login ignorado — credenciais ou socket indisponíveis', {
        hasCredentials: Boolean(creds),
        hasSocket: Boolean(this.socket),
      });
      return;
    }

    const accessToken = await resolveSessionAccessToken();
    const serverId = getClientRuntimeConfig()?.serverId?.trim().toLowerCase();
    if (!serverId) {
      console.error(`[PositionGateway] ${ARCHITECTURE_SERVER_ID_REQUIRED} — carregue /config/client antes do world-login.`);
      this.onWorldLoginBlocked?.('WRONG_SERVER');
      return;
    }

    if (!accessToken) {
      console.error('[PositionGateway] world-login bloqueado — sessão JWT ausente.');
      this.onWorldLoginBlocked?.('AUTH_REQUIRED');
      return;
    }

    this.socket.send('world-login', {

      playerId: creds.playerId,

      characterId: creds.characterId,

      serverId,

      displayName: creds.displayName,

      ...(accessToken ? { accessToken } : {}),

      clientMapId: clientPositionIgnored?.mapId,

      clientPosition: clientPositionIgnored

        ? { x: clientPositionIgnored.x, y: clientPositionIgnored.y }

        : undefined,

    });

  }



  /** Reenvia world-login para atualizar JWT armazenado no servidor (C.2). */
  async refreshServerAccessToken(): Promise<void> {
    await this.requestWorldLogin(this.captureSnapshot());
  }



  startHeartbeat(): void {

    if (getActionDispatcher().getMode() === 'online') {

      return;

    }

    this.stopHeartbeat();

    this.heartbeatHandle = setInterval(() => {

      this.flush('heartbeat');

    }, HEARTBEAT_MS);

  }



  stopHeartbeat(): void {

    if (this.heartbeatHandle !== null) {

      clearInterval(this.heartbeatHandle);

      this.heartbeatHandle = null;

    }

  }



  flush(reason: PositionSyncReason): void {

    if (!this.isExploration()) {

      return;

    }



    const creds = this.getCredentials();

    if (!creds || !this.socket) return;



    if (getActionDispatcher().getMode() === 'online') {

      return;

    }



    if (reason === 'battle' || reason === 'logout') {

      return;

    }



    const snapshot = this.captureSnapshot();

    this.socket.send('position-sync', {

      characterId: creds.characterId,

      currentMapId: snapshot.mapId,

      lastPosition: { x: snapshot.x, y: snapshot.y },

      facing: snapshot.facing,

      reason,

    });

  }



  destroy(): void {

    this.stopHeartbeat();

  }

}


