import type { MovePlayerIntentPayload, RotatePlayerIntentPayload } from '../../shared/world/movementIntent.js';
import { PositionGateway, type ProcessMoveResult, type ProcessRotateResult } from './PositionGateway.js';
import { createRegistryPositionGatewayServer } from './positionGatewayServer.js';

type QueuedMoveIntent = MovePlayerIntentPayload;

type ConnectionMoveState = {
  readonly queue: QueuedMoveIntent[];
  lastProcessedSeq: number;
  lastProcessedRotateSeq: number;
};

const MAX_MOVE_QUEUE_DEPTH = 8;

/**
 * 1 passo por tick — catch-up em rajada virava “dash residual” após soltar a tecla.
 * Fila cobre RTT; o sprite local já andou esses tiles e espera o servidor alcançar.
 */
export const MOVE_CATCHUP_MAX_PER_TICK = 1;

/**
 * Acumula intenções MOVE e processa no WorldTick (1 SQM por tick).
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
    if (state.queue.length >= MAX_MOVE_QUEUE_DEPTH) {
      state.queue.shift();
    }
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

  queueDepth(connectionId: string): number {
    return this.byConnection.get(connectionId)?.queue.length ?? 0;
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

  /**
   * Processa 1 passo por tick. Rajada extra virava movimento residual após Key Up.
   */
  processCatchUp(
    connectionId: string,
    playerId: string,
    characterId: number,
  ): ProcessMoveResult | null {
    let lastMeaningful: ProcessMoveResult | null = null;
    for (let i = 0; i < MOVE_CATCHUP_MAX_PER_TICK; i += 1) {
      const result = this.processNext(connectionId, playerId, characterId);
      if (!result) break;
      lastMeaningful = result;
      if (!result.ok) continue;
    }
    return lastMeaningful;
  }
}
