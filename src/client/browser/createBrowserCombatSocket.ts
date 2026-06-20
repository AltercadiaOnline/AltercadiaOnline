import type { EquippedSlots } from '../../shared/character/equipmentState.js';
import type { MarcoDominanceInput } from '../../shared/progression/estiloPersonagem.js';
import type { CombatClassId } from '../../shared/types.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { ActionRequest } from '../../shared/events.js';
import type { CombatSocket } from '../hud/combatSocketHandler.js';
import {
  abortCombatFeedbackOnDisconnect,
  releaseCombatActionLock,
  releaseForfeitInFlight,
} from '../hud/index.js';
import { USER_WS_CONNECT_FAILED } from '../../shared/brand.js';
import { getGameStore } from '../state/GameStore.js';
import {
  connectionPhaseLabel,
  setConnectionPhase,
  type ConnectionPhase,
} from '../sync/connectionState.js';

export type BrowserCombatSocket = CombatSocket & {
  readonly readyState: number;
  send(type: 'combat-action', payload: ActionRequest): void;
  send(type: 'combat-join', payload?: {
    readonly displayName?: string;
    readonly classId?: CombatClassId;
    readonly activeMovesets?: readonly string[];
    readonly monsterInstanceId?: string;
    readonly worldVitals?: {
      readonly hpCurrent: number;
      readonly hpMax: number;
      readonly mpCurrent: number;
      readonly mpMax: number;
    };
    readonly marcoDominance?: MarcoDominanceInput;
    readonly equipmentSnapshot?: EquippedSlots;
  }): void;
  send(type: 'combat-collect-loot', payload: { readonly lootId: string; readonly battleId: string }): void;
  send(type: 'combat-dismiss-loot', payload: { readonly lootId: string }): void;
  send(type: string, payload?: unknown): void;
  onOpen(handler: () => void): void;
  onError(handler: (message: string) => void): void;
  onClose(handler: (message: string) => void): void;
  onPhaseChange(handler: (phase: ConnectionPhase) => void): void;
  getConnectionPhase(): ConnectionPhase;
  removeAllListeners(event?: string): void;
  close(code?: number, reason?: string): void;
};

export type ResilientSocketOptions = {
  readonly maxReconnectAttempts?: number;
  readonly onReconnect?: () => void;
  /** Erros de sistema (auth, shard, perfil) vindos de combat-error. */
  readonly onSystemError?: (reason: string, payload: unknown) => void;
};

const WS_OPEN = 1;
const WS_CONNECTING = 0;

function createSocketHandlers() {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const openHandlers = new Set<() => void>();
  const errorHandlers = new Set<(message: string) => void>();
  const closeHandlers = new Set<(message: string) => void>();
  const phaseHandlers = new Set<(phase: ConnectionPhase) => void>();

  return {
    handlers,
    openHandlers,
    errorHandlers,
    closeHandlers,
    phaseHandlers,
  };
}

function bindWsEvents(
  ws: WebSocket,
  store: ReturnType<typeof createSocketHandlers>,
  onSystemError?: ResilientSocketOptions['onSystemError'],
): void {
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(String(event.data)) as { type?: string; payload?: unknown };
      if (!data?.type) return;

      if (data.type === 'combat-error') {
        const reason =
          typeof data.payload === 'object'
          && data.payload !== null
          && 'reason' in data.payload
            ? String((data.payload as { reason?: unknown }).reason ?? 'COMBAT_ERROR')
            : 'COMBAT_ERROR';
        console.warn('[WS] combat-error:', data.payload);
        onSystemError?.(reason, data.payload);
        getGameStore().rejectLatestCombatPending(reason);
        abortCombatFeedbackOnDisconnect();
        releaseForfeitInFlight();
        releaseCombatActionLock();
        return;
      }

      const set = store.handlers.get(data.type);
      if (set) {
        for (const handler of set) {
          handler(data.payload);
        }
      }
    } catch (error) {
      console.error('[WS] Falha ao processar mensagem:', error);
    }
  });
}

/**
 * WebSocket resiliente — reconexão automática + fase Connecting/Reconnecting.
 */
export function createBrowserCombatSocket(
  wsUrl: string,
  options: ResilientSocketOptions = {},
): BrowserCombatSocket {
  const maxAttempts = options.maxReconnectAttempts ?? 8;
  const store = createSocketHandlers();

  let ws: WebSocket | null = null;
  let manualClose = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let phase: ConnectionPhase = 'disconnected';

  const notifyPhase = (next: ConnectionPhase) => {
    phase = next;
    setConnectionPhase(next);
    for (const handler of store.phaseHandlers) handler(next);
  };

  const emitOpen = () => {
    for (const handler of store.openHandlers) handler();
  };

  const connect = () => {
    if (manualClose) return;
    notifyPhase(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    ws = new WebSocket(wsUrl);
    bindWsEvents(ws, store, options.onSystemError);

    ws.addEventListener('open', () => {
      reconnectAttempt = 0;
      notifyPhase('connected');
      options.onReconnect?.();
      emitOpen();
    });

    ws.addEventListener('error', () => {
      console.warn('[CombatSocket] Falha no WebSocket — verifique GAME_WS_URL e CORS_ORIGIN.');
      for (const handler of store.errorHandlers) handler(USER_WS_CONNECT_FAILED);
    });

    ws.addEventListener('close', (event) => {
      const hint =
        event.code === 1006
          ? 'Conexão fechada (1006) — servidor inacessível ou módulos JS não carregaram.'
          : `Conexão fechada (${event.code}).`;
      for (const handler of store.closeHandlers) handler(hint);

      if (manualClose) {
        notifyPhase('disconnected');
        return;
      }

      if (reconnectAttempt >= maxAttempts) {
        notifyPhase('disconnected');
        return;
      }

      const delayMs = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
      reconnectAttempt += 1;
      notifyPhase('reconnecting');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    });
  };

  connect();

  return {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },

    getConnectionPhase() {
      return phase;
    },

    onPhaseChange(handler: (next: ConnectionPhase) => void): void {
      store.phaseHandlers.add(handler);
      handler(phase);
    },

    on(event: string, handler: (...args: unknown[]) => void): void {
      if (!store.handlers.has(event)) store.handlers.set(event, new Set());
      store.handlers.get(event)!.add((payload: unknown) => handler(payload));
    },

    onOpen(handler: () => void): void {
      store.openHandlers.add(handler);
      if (ws?.readyState === WS_OPEN) handler();
    },

    onError(handler: (message: string) => void): void {
      store.errorHandlers.add(handler);
    },

    onClose(handler: (message: string) => void): void {
      store.closeHandlers.add(handler);
    },

    removeAllListeners(event?: string): void {
      if (event) store.handlers.delete(event);
      else store.handlers.clear();
    },

    send(type: string, payload?: unknown): void {
      if (!ws || ws.readyState !== WS_OPEN) {
        console.warn('[WS] Socket fechado — mensagem ignorada:', type);
        if (type === 'combat-action') {
          releaseCombatActionLock();
        } else if (type === 'combat-forfeit') {
          releaseForfeitInFlight();
        }
        return;
      }
      ws.send(JSON.stringify({ type, payload: payload ?? {} }));
    },

    close(code = 1000, reason = 'client_exit'): void {
      manualClose = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws && (ws.readyState === WS_OPEN || ws.readyState === WS_CONNECTING)) {
        ws.close(code, reason);
      }
      notifyPhase('disconnected');
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

export { connectionPhaseLabel };
