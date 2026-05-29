import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { ActionRequest } from '../../shared/events.js';
import type { CombatSocket } from '../hud/combatSocketHandler.js';

export type BrowserCombatSocket = CombatSocket & {
  readonly readyState: number;
  send(type: 'combat-action', payload: ActionRequest): void;
  send(type: 'combat-join', payload?: { readonly displayName?: string }): void;
  onOpen(handler: () => void): void;
  removeAllListeners(event?: string): void;
};

const WS_OPEN = 1;

export function createBrowserCombatSocket(wsUrl: string): BrowserCombatSocket {
  const ws = new WebSocket(wsUrl);
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const openHandlers = new Set<() => void>();

  ws.addEventListener('open', () => {
    openHandlers.forEach((handler) => handler());
  });

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(String(event.data)) as { type?: string; payload?: unknown };
      if (!data?.type) return;

      if (data.type === 'combat-error') {
        console.warn('[WS] combat-error:', data.payload);
        return;
      }

      const set = handlers.get(data.type);
      if (set) {
        for (const handler of set) {
          handler(data.payload);
        }
      }
    } catch (error) {
      console.error('[WS] Falha ao processar mensagem:', error);
    }
  });

  return {
    get readyState() {
      return ws.readyState;
    },

    on(event: string, handler: (...args: unknown[]) => void): void {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add((payload: unknown) => handler(payload));
    },

    onOpen(handler: () => void): void {
      openHandlers.add(handler);
      if (ws.readyState === WS_OPEN) handler();
    },

    removeAllListeners(event?: string): void {
      if (event) handlers.delete(event);
      else handlers.clear();
    },

    send(type: string, payload?: unknown): void {
      if (ws.readyState !== WS_OPEN) {
        console.warn('[WS] Socket fechado — mensagem ignorada:', type);
        return;
      }
      ws.send(JSON.stringify({ type, payload: payload ?? {} }));
    },
  } as BrowserCombatSocket;
}

/** Tipagem estreita para o handler do canal combat-event. */
export function onCombatEvent(
  socket: BrowserCombatSocket,
  handler: (payload: CombatDispatchPayload) => void,
): void {
  socket.on('combat-event', (raw) => {
    handler(raw as CombatDispatchPayload);
  });
}
