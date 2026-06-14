import type { MovePlayerIntentPayload, RotatePlayerIntentPayload } from '../../shared/world/movementIntent.js';
import { PositionGateway, type ProcessMoveResult, type ProcessRotateResult } from './PositionGateway.js';
import { createRegistryPositionGatewayServer } from './positionGatewayServer.js';

type QueuedMoveIntent = MovePlayerIntentPayload;

type ConnectionMoveState = {
  readonly queue: QueuedMoveIntent[];
  lastProcessedSeq: number;
  lastProcessedRotateSeq: number;
};

/**
 * Acumula intenções MOVE e processa no WorldTick (1 por tick por conexão).
 */
export class MovementIntentHandler {
  private readonly positionGateway = new PositionGateway(createRegistryPositionGatewayServer());
  private readonly byConnection = new Map<string, ConnectionMoveState>();

  enqueue(connectionId: string, payload: MovePlayerIntentPayload): void {
    const state = this.byConnection.get(connectionId) ?? {
      queue: [],
      lastProcessedSeq: 0,
      lastProcessedRotateSeq: 0,
    };
    state.queue.push(payload);
    this.byConnection.set(connectionId, state);
  }

  processRotate(
    playerId: string,
    characterId: number,
    connectionId: string,
    payload: RotatePlayerIntentPayload,
  ): ProcessRotateResult | null {
    const state = this.byConnection.get(connectionId) ?? {
      queue: [],
      lastProcessedSeq: 0,
      lastProcessedRotateSeq: 0,
    };
    this.byConnection.set(connectionId, state);

    if (payload.seq <= state.lastProcessedRotateSeq) {
      return { ok: false, reason: 'STALE_SEQ', seq: payload.seq };
    }

    const result = this.positionGateway.processRotateIntent(playerId, characterId, payload);
    if (!result) {
      state.lastProcessedRotateSeq = payload.seq;
      return null;
    }
    state.lastProcessedRotateSeq = payload.seq;
    return result;
  }

  clearConnection(connectionId: string): void {
    this.byConnection.delete(connectionId);
  }

  processNext(
    connectionId: string,
    playerId: string,
    characterId: number,
  ): ProcessMoveResult | null {
    const state = this.byConnection.get(connectionId);
    if (!state || state.queue.length === 0) return null;

    const intent = state.queue.shift()!;
    if (intent.seq <= state.lastProcessedSeq) {
      return { ok: false, reason: 'STALE_SEQ', seq: intent.seq };
    }

    const result = this.positionGateway.processMoveIntent(playerId, characterId, intent);
    if (!result) {
      state.lastProcessedSeq = intent.seq;
      return null;
    }
    state.lastProcessedSeq = intent.seq;
    return result;
  }
}
