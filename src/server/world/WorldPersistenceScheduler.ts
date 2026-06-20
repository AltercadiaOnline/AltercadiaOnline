import type { ServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import {
  isDurablePersistence,
  persistCharacterSession,
  persistPendingLootSnapshot,
} from '../persistence/PersistenceGateway.js';
import { buildCriticalCharacterDataFromRuntime } from '../supabase/buildCriticalCharacterData.js';
import {
  getPersistenceManager,
  initPersistenceManager,
} from '../supabase/persistenceManagerRegistry.js';
import type { WorldGameState } from './WorldGameState.js';

/**
 * Orquestra flush file + Supabase híbrido (PersistenceManager).
 */
export class WorldPersistenceScheduler {
  private flushing = false;

  constructor(
    private readonly env: ServerEnv,
    private readonly gameState: WorldGameState,
  ) {
    initPersistenceManager(env);
    getPersistenceManager()?.start();
  }

  start(): void {
    getPersistenceManager()?.start();
  }

  stop(): void {
    getPersistenceManager()?.stop();
  }

  async flushPlayer(playerId: string, characterId: number, reason: string): Promise<void> {
    try {
      if (isDurablePersistence()) {
        await persistCharacterSession(playerId, characterId);
        await persistPendingLootSnapshot();
      }

      const manager = getPersistenceManager();
      if (manager?.isEnabled()) {
        const serverId = getServerInstanceContext().id;
        const scope = manager.resolveScope(playerId, characterId, serverId);
        const critical = buildCriticalCharacterDataFromRuntime(playerId, characterId);

        await manager.saveCritical(scope, critical);
        await manager.flushPositions(scope, reason as import('../supabase/persistenceManagerTypes.js').PersistenceFlushReason);
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
      const players = this.gameState.listPersistablePlayers();
      await Promise.all(players.map((row) => this.flushPlayer(row.playerId, row.characterId, reason)));
    } finally {
      this.flushing = false;
    }
  }
}
