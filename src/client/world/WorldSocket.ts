import type { MoveIntent, PlayerPositionUpdate } from '../../shared/world/protocol.js';

/** Contrato do canal de mundo — substituível por WebSocket/Socket.io real. */
export interface WorldSocket {
  emit(event: 'move', payload: MoveIntent): void;
  on(event: 'player-update', handler: (payload: PlayerPositionUpdate) => void): void;
}
