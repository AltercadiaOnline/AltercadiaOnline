import type { WebSocket } from 'ws';
import { globalEventBus } from '../../../Economy/EventBus.js';
import type { EconomyEvent } from '../../../shared/economy/events.js';
import { EconomyEventType } from '../../../shared/economy/events.js';
import type { StateSyncBody, SyncEnvelope } from '../../../shared/sync/syncProtocol.js';
import type { WsOutboundMessage } from '../../../shared/wsProtocol.js';
import {
  isDurablePersistence,
  persistPendingLootSnapshot,
} from '../../persistence/PersistenceGateway.js';
import type { ServerSyncAuthority } from '../../sync/ServerSyncAuthority.js';
import type { WorldConnectionState } from './wsConnectionTypes.js';

const FORWARDED_ECONOMY_EVENTS = [
  EconomyEventType.LootGranted,
  EconomyEventType.WalletUpdated,
  EconomyEventType.AlterExchangeCompleted,
  EconomyEventType.InventoryUpdated,
  EconomyEventType.UpdateBankSuccess,
  EconomyEventType.WorldVitalsUpdated,
  EconomyEventType.PetAffinityUpdated,
  EconomyEventType.PetRosterUpdated,
  EconomyEventType.TransactionFailed,
] as const;

export type EconomyEventForwarderDeps = {
  readonly getSocketByPlayerId: (playerId: string) => WebSocket | undefined;
  readonly syncAuthority: ServerSyncAuthority;
  readonly sendStateSync: (
    ws: WebSocket,
    envelope: SyncEnvelope,
    body: StateSyncBody,
  ) => void;
  readonly send: (ws: WebSocket, message: WsOutboundMessage) => void;
  readonly worldConnections: ReadonlyMap<string, WorldConnectionState>;
  readonly scheduleCharacterPersist: (playerId: string, characterId: number) => void;
};

/** Encaminha eventos do EventBus econômico para o WS do jogador e agenda persistência. */
export class EconomyEventForwarder {
  private bound = false;
  private readonly unbindFns: Array<() => void> = [];

  bind(deps: EconomyEventForwarderDeps): void {
    if (this.bound) return;

    const forward = (event: EconomyEvent) => {
      const playerId = 'playerId' in event.payload ? event.payload.playerId : null;
      if (!playerId) return;

      const ws = deps.getSocketByPlayerId(playerId);
      if (ws) {
        deps.sendStateSync(
          ws,
          deps.syncAuthority.nextEnvelope('delta'),
          { mode: 'economy', event },
        );
        deps.send(ws, { type: 'economy-event', payload: event });
      }

      schedulePersistFromEconomyEvent(deps, playerId, event);
    };

    for (const type of FORWARDED_ECONOMY_EVENTS) {
      this.unbindFns.push(globalEventBus.on(type, forward));
    }

    this.bound = true;
  }

  unbind(): void {
    if (!this.bound) return;

    for (const unbind of this.unbindFns) {
      unbind();
    }

    this.unbindFns.length = 0;
    this.bound = false;
  }
}

function schedulePersistFromEconomyEvent(
  deps: EconomyEventForwarderDeps,
  playerId: string,
  event: EconomyEvent,
): void {
  if (!isDurablePersistence()) return;

  let characterId: number | undefined;
  if ('characterId' in event.payload && typeof event.payload.characterId === 'number') {
    characterId = event.payload.characterId;
  } else {
    for (const world of deps.worldConnections.values()) {
      if (world.playerId === playerId) {
        characterId = world.characterId;
        break;
      }
    }
  }

  if (characterId !== undefined) {
    deps.scheduleCharacterPersist(playerId, characterId);
  }

  if (event.type === EconomyEventType.LootGranted) {
    void persistPendingLootSnapshot();
  }
}
