import type { ExplorationSnapshot } from '../../shared/game/gameState.js';

import type { PositionSyncReason } from '../../shared/world/playerWorldProfile.js';

import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';

import { getActionDispatcher } from '../ActionDispatcher.js';



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

  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;



  constructor(options: PositionGatewayOptions) {

    this.socket = options.socket;

    this.getCredentials = options.getCredentials;

    this.captureSnapshot = options.captureSnapshot;

    this.isExploration = options.isExploration;

  }



  bindSocket(socket: BrowserCombatSocket): void {

    this.socket = socket;

  }



  requestWorldLogin(clientPositionIgnored?: ExplorationSnapshot): void {

    const creds = this.getCredentials();

    if (!creds || !this.socket) {
      console.warn('[PositionGateway] world-login ignorado — credenciais ou socket indisponíveis', {
        hasCredentials: Boolean(creds),
        hasSocket: Boolean(this.socket),
      });
      return;
    }



    this.socket.send('world-login', {

      playerId: creds.playerId,

      characterId: creds.characterId,

      displayName: creds.displayName,

      clientMapId: clientPositionIgnored?.mapId,

      clientPosition: clientPositionIgnored

        ? { x: clientPositionIgnored.x, y: clientPositionIgnored.y }

        : undefined,

    });

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


