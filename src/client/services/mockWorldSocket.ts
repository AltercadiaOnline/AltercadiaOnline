import { applyMove } from '../../shared/world/movement.js';
import type { MoveIntent, PlayerPositionUpdate } from '../../shared/world/protocol.js';
import { mapPixelHeight, mapPixelWidth } from '../../shared/world/worldMap.js';
import type { WorldSocket } from '../world/WorldSocket.js';

type PlayerUpdateHandler = (payload: PlayerPositionUpdate) => void;

/** Simula a autoridade do servidor até o WebSocket real estar pronto. */
export function createMockWorldSocket(mapData: number[][]): WorldSocket {
  const player = {
    x: mapPixelWidth() / 2,
    y: mapPixelHeight() / 2,
  };

  const updateHandlers = new Set<PlayerUpdateHandler>();

  const publishUpdate = (): void => {
    const snapshot: PlayerPositionUpdate = { x: player.x, y: player.y };
    for (const handler of updateHandlers) {
      handler(snapshot);
    }
  };

  publishUpdate();

  return {
    emit(event: 'move', payload: MoveIntent): void {
      if (event !== 'move') return;

      const next = applyMove(player, payload.direction, mapData);
      player.x = next.x;
      player.y = next.y;
      publishUpdate();
    },

    on(event: 'player-update', handler: PlayerUpdateHandler): void {
      if (event !== 'player-update') return;
      updateHandlers.add(handler);
      handler({ x: player.x, y: player.y });
    },
  };
}
