// @ts-nocheck
/**
 * Socket de combate in-memory — mesmo contrato BrowserCombatSocket, sem WebSocket.
 * Roteia o mesmo protocolo online:
 * - pve-encounter-accept / flee / request
 * - combat-join / combat-action / combat-forfeit
 * - portal-transition-request
 * para LocalCombatAuthority + runtime PVE local.
 */
import { USER_WS_CONNECT_FAILED } from '../../../shared/brand.js';
import { resolvePortalTransition, } from '../../../shared/world/zoneTransition.js';
import { getGameStore } from '../../state/GameStore.js';
import { loadCombatClient } from '../../domains/ServiceRegistry.js';
import { setConnectionPhase, } from '../../sync/connectionState.js';
import { ensureClientZone } from '../../world/zoneLoad/zoneLoadClient.js';
import { dispatchLocalPveEncounter, tryAcceptLocalPveEncounter, } from '../../world/localPveEncounterRuntime.js';
import { bindLocalCombatEmitter, localCombatAcceptPve, localCombatDispatchAction, localCombatForfeit, resetLocalCombatAuthority, } from './localCombatAuthority.js';
export function createLocalCombatSocket(getLoadout, options = {}) {
    const handlers = new Map();
    const openHandlers = new Set();
    const errorHandlers = new Set();
    const closeHandlers = new Set();
    const phaseHandlers = new Set();
    let phase = 'disconnected';
    let closed = false;
    const notifyPhase = (next) => {
        phase = next;
        setConnectionPhase(next);
        for (const handler of phaseHandlers)
            handler(next);
    };
    const emitToHandlers = (type, payload) => {
        if (type === 'combat-error') {
            const reason = typeof payload === 'object'
                && payload !== null
                && 'reason' in payload
                ? String(payload.reason ?? 'COMBAT_ERROR')
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
        if (!set)
            return;
        for (const handler of set) {
            handler(payload);
        }
    };
    bindLocalCombatEmitter(emitToHandlers);
    queueMicrotask(() => {
        if (closed)
            return;
        notifyPhase('connected');
        for (const handler of openHandlers)
            handler();
    });
    const socket = {
        get readyState() {
            return phase === 'connected' ? 1 : 0;
        },
        send(type, payload) {
            if (closed)
                return;
            if (type === 'combat-action') {
                void localCombatDispatchAction(payload);
                return;
            }
            if (type === 'combat-forfeit') {
                const battleId = typeof payload === 'object'
                    && payload !== null
                    && 'battleId' in payload
                    ? String(payload.battleId ?? '')
                    : '';
                void localCombatForfeit(battleId);
                return;
            }
            const monsterInstanceIdFromPayload = typeof payload === 'object'
                && payload !== null
                && 'monsterInstanceId' in payload
                ? String(payload.monsterInstanceId ?? '')
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
                const request = payload;
                if (!request
                    || typeof request !== 'object'
                    || typeof request.requestId !== 'string'
                    || typeof request.portalId !== 'string') {
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
                ensureClientZone(resolved.ready.mapId);
                emitToHandlers('portal-transition-ready', resolved.ready);
                return;
            }
        },
        on(event, handler) {
            let set = handlers.get(event);
            if (!set) {
                set = new Set();
                handlers.set(event, set);
            }
            set.add(handler);
        },
        onOpen(handler) {
            openHandlers.add(handler);
        },
        onError(handler) {
            errorHandlers.add(handler);
        },
        onClose(handler) {
            closeHandlers.add(handler);
        },
        onPhaseChange(handler) {
            phaseHandlers.add(handler);
        },
        getConnectionPhase() {
            return phase;
        },
        removeAllListeners(event) {
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
            notifyPhase('disconnected');
            for (const handler of closeHandlers) {
                handler(USER_WS_CONNECT_FAILED);
            }
        },
    };
    return socket;
}
