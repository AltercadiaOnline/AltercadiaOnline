import type { WebSocket } from 'ws';

type PlayerSocketLookup = (playerId: string) => WebSocket | undefined;

let lookup: PlayerSocketLookup | null = null;

/** Ligado pelo CombatWsHub no boot — handlers sociais notificam outro jogador. */
export function bindPlayerSocketLookup(next: PlayerSocketLookup | null): void {
  lookup = next;
}

export function getPlayerSocket(playerId: string): WebSocket | undefined {
  return lookup?.(playerId);
}
