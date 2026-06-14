export type ConnectionPhase = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

let phase: ConnectionPhase = 'disconnected';
const listeners = new Set<(next: ConnectionPhase) => void>();

export function getConnectionPhase(): ConnectionPhase {
  return phase;
}

export function setConnectionPhase(next: ConnectionPhase): void {
  if (phase === next) return;
  phase = next;
  for (const listener of listeners) {
    listener(next);
  }
}

export function subscribeConnectionPhase(listener: (next: ConnectionPhase) => void): () => void {
  listeners.add(listener);
  listener(phase);
  return () => listeners.delete(listener);
}

export function connectionPhaseLabel(next: ConnectionPhase): string {
  switch (next) {
    case 'connecting':
      return 'Conectando…';
    case 'connected':
      return 'Conectado';
    case 'reconnecting':
      return 'Reconectando…';
    default:
      return 'Desconectado';
  }
}
