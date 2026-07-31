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

/** Catch-up sob fila: até N passos válidos por tick (anti-speedhack com cap). */
export const MOVE_CATCHUP_MAX_PER_TICK = 3;

/**
 * Acumula intenções MOVE e processa no WorldTick.
 * 1 passo por tick em fila baixa; até MOVE_CATCHUP_MAX_PER_TICK se a fila crescer (hold + RTT).
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
   * Processa 1 passo, ou até MOVE_CATCHUP_MAX_PER_TICK se a fila estiver congestionada.
   * Retorna o último resultado com mudança (posição final do tick).
   */
  processCatchUp(
    connectionId: string,
    playerId: string,
    characterId: number,
  ): ProcessMoveResult | null {
    const depthBefore = this.queueDepth(connectionId);
    const budget = depthBefore >= 2 ? MOVE_CATCHUP_MAX_PER_TICK : 1;

    let lastMeaningful: ProcessMoveResult | null = null;
    for (let i = 0; i < budget; i += 1) {
      const result = this.processNext(connectionId, playerId, characterId);
      if (!result) break;
      // Intent inválido: descarta e tenta o próximo (não trava o hold inteiro).
      if (!result.ok) {
        lastMeaningful = result;
        continue;
      }
      lastMeaningful = result;
    }
    return lastMeaningful;
  }
}
