/**
 * Socket de combate in-memory — mesmo contrato BrowserCombatSocket, sem WebSocket.
 * Roteia o mesmo protocolo online:
 * - pve-encounter-accept / flee / request
 * - pvp-ranked-join / leave / ready / unready
 * - combat-join / combat-action / combat-forfeit
 * - portal-transition-request
 * para LocalCombatAuthority + LocalPvpRankedAuthority + runtime PVE local.
 */

import type { ActionRequest } from '../../../shared/events.js';
import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import { USER_WS_CONNECT_FAILED } from '../../../shared/brand.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import {
  resolvePortalTransition,
  type PortalTransitionRequestPayload,
} from '../../../shared/world/zoneTransition.js';
import { getGameStore } from '../../state/GameStore.js';
import { loadCombatClient } from '../../domains/ServiceRegistry.js';
import {
  setConnectionPhase,
  type ConnectionPhase,
} from '../../sync/connectionState.js';
import type { BrowserCombatSocket } from '../../browser/createBrowserCombatSocket.js';
import { ensureClientZone } from '../../world/zoneLoad/zoneLoadClient.js';
import {
  dispatchLocalPveEncounter,
  tryAcceptLocalPveEncounter,
} from '../../world/localPveEncounterRuntime.js';
import {
  bindLocalCombatEmitter,
  localCombatAcceptPve,
  localCombatDispatchAction,
  localCombatForfeit,
  resetLocalCombatAuthority,
} from './localCombatAuthority.js';
import {
  bindLocalPvpRankedEmitter,
  bindLocalPvpLoadoutProvider,
  hasLocalPvpPracticeSession,
  localPvpRankedDispatchAction,
  localPvpRankedForfeit,
  localPvpRankedJoin,
  localPvpRankedLeave,
  localPvpRankedReady,
  localPvpRankedUnready,
  resetLocalPvpRankedAuthority,
} from './localPvpRankedAuthority.js';

export type LocalCombatLoadoutProvider = () => PlayerCombatLoadout | null;

type HandlerSet = Set<(payload: unknown) => void>;

export function createLocalCombatSocket(
  getLoadout: LocalCombatLoadoutProvider,
  options: {
    readonly onSystemError?: (reason: string, payload: unknown) => void;
  } = {},
): BrowserCombatSocket {
  const handlers = new Map<string, HandlerSet>();
  const openHandlers = new Set<() => void>();
  const errorHandlers = new Set<(message: string) => void>();
  const closeHandlers = new Set<(message: string) => void>();
  const phaseHandlers = new Set<(phase: ConnectionPhase) => void>();

  let phase: ConnectionPhase = 'disconnected';
  let closed = false;

  const notifyPhase = (next: ConnectionPhase) => {
    phase = next;
    setConnectionPhase(next);
    for (const handler of phaseHandlers) handler(next);
  };

  const emitToHandlers = (type: string, payload: unknown) => {
    if (type === 'combat-error') {
      const reason =
        typeof payload === 'object'
        && payload !== null
        && 'reason' in payload
          ? String((payload as { reason?: unknown }).reason ?? 'COMBAT_ERROR')
          : 'COMBAT_ERROR';
      console.warn('[LocalCombatSocket] combat-error:', payload);
      options.onSystemError?.(reason, payload);
      getGameStore().rejectLatestCombatPending(reason);
      void loadCombatClient().then((combat) => {
        combat.abortCombatFeedbackOnDisconnect();
        combat.releaseForfeitInFlight();
        combat.releaseCombatActionLock();
      });
    }

    const set = handlers.get(type);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  };

  bindLocalCombatEmitter(emitToHandlers);
  bindLocalPvpRankedEmitter(emitToHandlers);
  bindLocalPvpLoadoutProvider(getLoadout);

  queueMicrotask(() => {
    if (closed) return;
    notifyPhase('connected');
    for (const handler of openHandlers) handler();
  });

  const socket = {
    get readyState() {
      return phase === 'connected' ? 1 : 0;
    },
    send(type: string, payload?: unknown) {
      if (closed) return;

      if (type === 'combat-action') {
        if (hasLocalPvpPracticeSession()) {
          void localPvpRankedDispatchAction(payload as ActionRequest);
          return;
        }
        void localCombatDispatchAction(payload as ActionRequest);
        return;
      }

      if (type === 'combat-forfeit') {
        const battleId =
          typeof payload === 'object'
          && payload !== null
          && 'battleId' in payload
            ? String((payload as { battleId?: unknown }).battleId ?? '')
            : '';
        if (hasLocalPvpPracticeSession()) {
          void localPvpRankedForfeit(battleId);
          return;
        }
        void localCombatForfeit(battleId);
        return;
      }

      if (
        type === 'pvp-ranked-join'
        || type === 'pvp-ranked-leave'
        || type === 'pvp-ranked-ready'
        || type === 'pvp-ranked-unready'
      ) {
        const stationPayload =
          typeof payload === 'object' && payload !== null
            ? payload as {
              readonly stationId: string;
              readonly displayName?: string;
              readonly skinBundleId?: string;
            }
            : { stationId: 'combate_pvp' };
        if (type === 'pvp-ranked-join') {
          localPvpRankedJoin(stationPayload);
          return;
        }
        if (type === 'pvp-ranked-leave') {
          localPvpRankedLeave(stationPayload);
          return;
        }
        if (type === 'pvp-ranked-ready') {
          localPvpRankedReady(stationPayload);
          return;
        }
        localPvpRankedUnready(stationPayload);
        return;
      }

      const monsterInstanceIdFromPayload =
        typeof payload === 'object'
        && payload !== null
        && 'monsterInstanceId' in payload
          ? String((payload as { monsterInstanceId?: unknown }).monsterInstanceId ?? '')
          : '';

      // Mesmo contrato online: Accept → pve-encounter-accept → autoridade inicia (START_COMBAT).
      if (type === 'pve-encounter-accept') {
        if (!monsterInstanceIdFromPayload) {
          emitToHandlers('combat-error', { reason: 'ENCOUNTER_REQUIRED' });
          return;
        }
        const accepted = tryAcceptLocalPveEncounter(monsterInstanceIdFromPayload);
        if (!accepted.ok) {
          emitToHandlers('combat-error', { reason: accepted.reason });
          return;
        }
        emitToHandlers('pve-encounter-clear', {
          monsterInstanceId: accepted.monsterInstanceId,
          reason: 'accepted',
        });
        const loadout = getLoadout();
        if (!loadout) {
          emitToHandlers('combat-error', { reason: 'PROFILE_NOT_READY' });
          return;
        }
        void localCombatAcceptPve({
          loadout,
          monsterInstanceId: accepted.monsterInstanceId,
        });
        return;
      }

      // Flee / request — mesma máquina local; force/fuga falha → combat-join.
      if (type === 'pve-encounter-flee' || type === 'pve-encounter-request') {
        if (!monsterInstanceIdFromPayload) {
          emitToHandlers('combat-error', { reason: 'ENCOUNTER_REQUIRED' });
          return;
        }
        dispatchLocalPveEncounter(type, { monsterInstanceId: monsterInstanceIdFromPayload });
        return;
      }

      // Force-join / fuga falha (prepareCombatJoin) — espelho de handleJoin.
      if (type === 'combat-join') {
        if (!monsterInstanceIdFromPayload) {
          emitToHandlers('combat-error', { reason: 'ENCOUNTER_REQUIRED' });
          return;
        }
        const loadout = getLoadout();
        if (!loadout) {
          emitToHandlers('combat-error', { reason: 'PROFILE_NOT_READY' });
          return;
        }
        void localCombatAcceptPve({
          loadout,
          monsterInstanceId: monsterInstanceIdFromPayload,
        });
        return;
      }

      if (type === 'combat-collect-loot' || type === 'combat-dismiss-loot') {
        return;
      }

      // Paridade Local × Online com PortalTransitionGateway (resolve + ensure zona).
      if (type === 'portal-transition-request') {
        const request = payload as PortalTransitionRequestPayload | null;
        if (
          !request
          || typeof request !== 'object'
          || typeof request.requestId !== 'string'
          || typeof request.portalId !== 'string'
        ) {
          return;
        }
        const resolved = resolvePortalTransition(request);
        if (!resolved.ok) {
          emitToHandlers('portal-transition-failed', {
            requestId: request.requestId,
            ...resolved.failed,
          });
          return;
        }
        ensureClientZone(resolved.ready.mapId as MapId);
        emitToHandlers('portal-transition-ready', resolved.ready);
        return;
      }
    },
    on(event: string, handler: (...args: unknown[]) => void): void {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as (payload: unknown) => void);
    },
    onOpen(handler: () => void) {
      openHandlers.add(handler);
    },
    onError(handler: (message: string) => void) {
      errorHandlers.add(handler);
    },
    onClose(handler: (message: string) => void) {
      closeHandlers.add(handler);
    },
    onPhaseChange(handler: (phase: ConnectionPhase) => void) {
      phaseHandlers.add(handler);
    },
    getConnectionPhase() {
      return phase;
    },
    removeAllListeners(event?: string) {
      if (event) {
        handlers.delete(event);
        return;
      }
      handlers.clear();
      openHandlers.clear();
      errorHandlers.clear();
      closeHandlers.clear();
      phaseHandlers.clear();
    },
    close() {
      closed = true;
      resetLocalCombatAuthority();
      resetLocalPvpRankedAuthority();
      bindLocalPvpLoadoutProvider(null);
      bindLocalPvpRankedEmitter(null);
      notifyPhase('disconnected');
      for (const handler of closeHandlers) {
        handler(USER_WS_CONNECT_FAILED);
      }
    },
  };

  return socket as unknown as BrowserCombatSocket;
}
