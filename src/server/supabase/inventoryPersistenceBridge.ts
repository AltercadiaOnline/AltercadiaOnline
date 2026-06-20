import { globalEventBus } from '../../Economy/EventBus.js';
import type { EconomyEvent } from '../../shared/economy/events.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { buildCriticalCharacterDataFromRuntime } from './buildCriticalCharacterData.js';
import { recordCriticalPersistSample } from './criticalPersistMetrics.js';
import { getPersistenceManager } from './persistenceManagerRegistry.js';

/** Inventário, moeda e banco — sempre HIGH_PRIORITY (saveCritical). */
const CRITICAL_ECONOMY_EVENTS = [
  EconomyEventType.InventoryUpdated,
  EconomyEventType.UpdateBankSuccess,
  EconomyEventType.WalletUpdated,
  EconomyEventType.AlterExchangeCompleted,
] as const;

const CRITICAL_PERSIST_DEBOUNCE_MS = 400;

type CriticalPersistKey = string;

export type CharacterIdResolver = (playerId: string) => number | undefined;

function persistKey(playerId: string, characterId: number): CriticalPersistKey {
  return `${playerId}:${characterId}`;
}

function revisionFromEvent(event: EconomyEvent): number {
  const payload = event.payload as { revision?: number };
  return typeof payload.revision === 'number' ? payload.revision : Date.now();
}

function characterIdFromEvent(event: EconomyEvent): number | undefined {
  const payload = event.payload as { characterId?: number };
  return typeof payload.characterId === 'number' ? payload.characterId : undefined;
}

function playerIdFromEvent(event: EconomyEvent): string | undefined {
  const payload = event.payload as { playerId?: string };
  return typeof payload.playerId === 'string' ? payload.playerId : undefined;
}

/**
 * Ponte EventBus → PersistenceManager para economia crítica (inventário + moeda).
 *
 * - Debounce por personagem (coalesce mutações rápidas).
 * - `revision` do evento como sequence — evita flush redundante e saves obsoletos.
 * - Flush sempre lê estado autoritativo atual (`buildCriticalCharacterDataFromRuntime`).
 * - Fila serializada do PersistenceManager garante ordem quando saves se sobrepõem.
 */
export class InventoryPersistenceBridge {
  private bound = false;
  private readonly unbindFns: Array<() => void> = [];
  private readonly debounceTimers = new Map<CriticalPersistKey, ReturnType<typeof setTimeout>>();
  private readonly latestRevisionByKey = new Map<CriticalPersistKey, number>();
  private readonly lastPersistedRevisionByKey = new Map<CriticalPersistKey, number>();
  private readonly scheduledRevisionByKey = new Map<CriticalPersistKey, number>();
  private readonly firstEventAtByKey = new Map<CriticalPersistKey, number>();
  private readonly lastEventTypeByKey = new Map<CriticalPersistKey, string>();
  private characterIdResolver: CharacterIdResolver | null = null;

  setCharacterIdResolver(resolver: CharacterIdResolver | null): void {
    this.characterIdResolver = resolver;
  }

  bind(): void {
    if (this.bound) return;

    const onCriticalEconomyEvent = (event: EconomyEvent) => {
      const playerId = playerIdFromEvent(event);
      if (!playerId) return;

      const manager = getPersistenceManager();
      if (!manager?.isEnabled()) return;

      const characterId =
        characterIdFromEvent(event) ?? this.characterIdResolver?.(playerId);
      if (characterId === undefined) return;

      const key = persistKey(playerId, characterId);
      const revision = revisionFromEvent(event);
      const previous = this.latestRevisionByKey.get(key) ?? 0;
      this.latestRevisionByKey.set(key, Math.max(previous, revision));
      this.lastEventTypeByKey.set(key, event.type);

      if (!this.debounceTimers.has(key)) {
        this.firstEventAtByKey.set(key, Date.now());
      }

      this.scheduleFlush(playerId, characterId);
    };

    for (const type of CRITICAL_ECONOMY_EVENTS) {
      this.unbindFns.push(globalEventBus.on(type, onCriticalEconomyEvent));
    }

    this.bound = true;
  }

  unbind(): void {
    if (!this.bound) return;

    for (const unbind of this.unbindFns) {
      unbind();
    }
    this.unbindFns.length = 0;

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.latestRevisionByKey.clear();
    this.lastPersistedRevisionByKey.clear();
    this.scheduledRevisionByKey.clear();
    this.firstEventAtByKey.clear();
    this.lastEventTypeByKey.clear();
    this.characterIdResolver = null;
    this.bound = false;
  }

  scheduleFlush(playerId: string, characterId: number): void {
    const manager = getPersistenceManager();
    if (!manager?.isEnabled()) return;

    const key = persistKey(playerId, characterId);
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const scheduledRevision = this.latestRevisionByKey.get(key) ?? Date.now();
    this.scheduledRevisionByKey.set(key, scheduledRevision);

    if (!this.firstEventAtByKey.has(key)) {
      this.firstEventAtByKey.set(key, Date.now());
    }

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        void this.flush(playerId, characterId);
      }, CRITICAL_PERSIST_DEBOUNCE_MS),
    );
  }

  private async flush(playerId: string, characterId: number): Promise<void> {
    const manager = getPersistenceManager();
    if (!manager?.isEnabled()) return;

    const key = persistKey(playerId, characterId);
    const scheduledRevision = this.scheduledRevisionByKey.get(key) ?? 0;
    const latestRevision = this.latestRevisionByKey.get(key) ?? scheduledRevision;
    const lastPersisted = this.lastPersistedRevisionByKey.get(key) ?? 0;
    const eventType = this.lastEventTypeByKey.get(key) ?? EconomyEventType.InventoryUpdated;
    const firstEventAt = this.firstEventAtByKey.get(key) ?? Date.now();
    const debounceMs = Math.max(0, Date.now() - firstEventAt);

    if (latestRevision > scheduledRevision) {
      this.scheduleFlush(playerId, characterId);
      return;
    }

    if (latestRevision <= lastPersisted) {
      this.firstEventAtByKey.delete(key);
      return;
    }

    const serverId = getServerInstanceContext().id;
    const scope = manager.resolveScope(playerId, characterId, serverId);
    const data = buildCriticalCharacterDataFromRuntime(playerId, characterId);

    const saveStartedAt = Date.now();
    try {
      await manager.saveCritical(scope, data);
      const saveMs = Date.now() - saveStartedAt;
      this.lastPersistedRevisionByKey.set(key, latestRevision);
      this.firstEventAtByKey.delete(key);

      const sample = recordCriticalPersistSample({
        eventType,
        playerId,
        characterId,
        revision: latestRevision,
        debounceMs,
        saveMs,
        ok: true,
      });

      console.info('[InventoryPersistenceBridge] Economia crítica persistida', {
        playerId,
        characterId,
        serverId: scope.serverId,
        revision: latestRevision,
        eventType,
        stackCount: data.inventory?.stacks.length ?? 0,
        dollarVolt: data.currency?.dollarVolt,
        alterCoins: data.currency?.alterCoins,
        debounceMs: sample.debounceMs,
        saveMs: sample.saveMs,
        totalMs: sample.totalMs,
      });
    } catch (error) {
      const saveMs = Date.now() - saveStartedAt;
      recordCriticalPersistSample({
        eventType,
        playerId,
        characterId,
        revision: latestRevision,
        debounceMs,
        saveMs,
        ok: false,
      });

      console.error('[InventoryPersistenceBridge] Falha ao persistir economia crítica', {
        playerId,
        characterId,
        serverId: scope.serverId,
        revision: latestRevision,
        eventType,
        debounceMs,
        saveMs,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

let bridge: InventoryPersistenceBridge | null = null;

export function initInventoryPersistenceBridge(): InventoryPersistenceBridge {
  if (!bridge) {
    bridge = new InventoryPersistenceBridge();
    bridge.bind();
  }
  return bridge;
}

export function getInventoryPersistenceBridge(): InventoryPersistenceBridge | null {
  return bridge;
}

export function resetInventoryPersistenceBridge(): void {
  bridge?.unbind();
  bridge = null;
}
