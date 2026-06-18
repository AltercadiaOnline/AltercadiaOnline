import type { ServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import {
  isDurablePersistence,
  persistCharacterSession,
  persistPendingLootSnapshot,
} from '../persistence/PersistenceGateway.js';
import {
  persistAuthoritativeLoginSnapshot,
  resolveLoginSnapshotScope,
} from '../supabase/persistAuthoritativeLoginSnapshot.js';
import { WORLD_PERSIST_INTERVAL_MS } from '../../shared/world/worldGameLoopConfig.js';
import type { WorldGameState } from './WorldGameState.js';

/**
 * Flush periódico memória → arquivo + Supabase sem bloquear o tick de jogo.
 */
export class WorldPersistenceScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(
    private readonly env: ServerEnv,
    private readonly gameState: WorldGameState,
    private readonly intervalMs = WORLD_PERSIST_INTERVAL_MS,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.flushAllActive('interval');
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async flushPlayer(playerId: string, characterId: number, reason: string): Promise<void> {
    try {
      if (isDurablePersistence()) {
        await persistCharacterSession(playerId, characterId);
        await persistPendingLootSnapshot();
      }

      if (this.env.supabaseUrl && this.env.supabaseServiceRoleKey) {
        const serverId = getServerInstanceContext().id;
        await persistAuthoritativeLoginSnapshot(
          this.env,
          resolveLoginSnapshotScope(playerId, serverId, characterId),
        );
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
