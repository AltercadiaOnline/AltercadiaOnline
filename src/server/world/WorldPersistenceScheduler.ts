import type { ServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import {
  isCharacterPersistenceDirty,
  isForcePersistReason,
} from '../persistence/characterPersistenceDirty.js';
import {
  isDurablePersistence,
  persistCharacterSession,
  persistPendingLootSnapshot,
} from '../persistence/PersistenceGateway.js';
import { persistStaticNetworkSnapshot } from '../persistence/staticNetworkPersistence.js';
import { buildCriticalCharacterDataFromRuntime } from '../supabase/buildCriticalCharacterData.js';
import {
  getPersistenceManager,
  initPersistenceManager,
} from '../supabase/persistenceManagerRegistry.js';
import type { PersistenceFlushReason } from '../supabase/persistenceManagerTypes.js';
import { WORLD_PERSIST_INTERVAL_MS } from '../../shared/world/worldGameLoopConfig.js';
import type { WorldGameState } from './WorldGameState.js';

/**
 * Orquestra flush file + Supabase híbrido.
 * File: só escreve se dirty (exceto force logout/disconnect/shutdown).
 * Intervalo: alinha com WORLD_PERSIST_INTERVAL_MS (posição / estado sujo).
 */
export class WorldPersistenceScheduler {
  private flushing = false;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly env: ServerEnv,
    private readonly gameState: WorldGameState,
  ) {
    initPersistenceManager(env);
    getPersistenceManager()?.start();
  }

  start(): void {
    getPersistenceManager()?.start();
    if (this.intervalTimer !== null) return;
    this.intervalTimer = setInterval(() => {
      void this.flushAllActive('interval');
    }, WORLD_PERSIST_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    getPersistenceManager()?.stop();
  }

  async flushPlayer(playerId: string, characterId: number, reason: string): Promise<void> {
    try {
      const force = isForcePersistReason(reason);
      const dirty = isCharacterPersistenceDirty(playerId, characterId);

      if (isDurablePersistence() && (force || dirty)) {
        const result = await persistCharacterSession(playerId, characterId, {
          force,
          reason,
        });
        if (result.wrote || force) {
          await persistPendingLootSnapshot();
        }
      }

      const manager = getPersistenceManager();
      if (manager?.isEnabled()) {
        const serverId = getServerInstanceContext().id;
        const scope = manager.resolveScope(playerId, characterId, serverId);

        // Critical só em force de sessão — economia já vai pelo InventoryPersistenceBridge.
        if (force) {
          const critical = buildCriticalCharacterDataFromRuntime(playerId, characterId);
          await manager.saveCritical(scope, critical);
        }

        await manager.flushPositions(scope, reason as PersistenceFlushReason);
      }
    } catch (error) {
      console.error('[WorldPersistence] Falha ao salvar jogador', {
        playerId,
        characterId,
        reason,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async flushAllActive(reason: string): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      if (isDurablePersistence()) {
        await persistStaticNetworkSnapshot();
      }
      const players = this.gameState.listPersistablePlayers();
      const force = isForcePersistReason(reason);
      const targets = force
        ? players
        : players.filter((row) => isCharacterPersistenceDirty(row.playerId, row.characterId));

      if (targets.length === 0) return;

      await Promise.all(
        targets.map((row) => this.flushPlayer(row.playerId, row.characterId, reason)),
      );
    } finally {
      this.flushing = false;
    }
  }
}
