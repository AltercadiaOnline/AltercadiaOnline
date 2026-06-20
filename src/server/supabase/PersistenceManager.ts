import type { SupabaseClient } from '@supabase/supabase-js';
import { characterPersistenceKey } from '../../shared/persistence/characterPersistenceRecord.js';
import {
  createCharacterServerKey,
  requireServerId,
  type CharacterServerKey,
} from '../../shared/supabase/characterServerScope.js';
import { WORLD_PERSIST_INTERVAL_MS } from '../../shared/world/worldGameLoopConfig.js';
import type { ServerEnv } from '../config/env.js';
import { isSupabaseAdminConfigured } from './supabaseAdmin.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';
import { upsertPlayerCurrency, upsertPlayerInventory } from './playerGameDataRepository.js';
import type {
  CharacterPersistenceScope,
  CriticalCharacterData,
  PendingWorldPosition,
  PersistenceFlushReason,
} from './persistenceManagerTypes.js';

const MAX_OPTIMISTIC_RETRIES = 3;

function scopeKey(scope: CharacterPersistenceScope): string {
  return `${scope.serverId}:${characterPersistenceKey(scope.userId, scope.characterId)}`;
}

/**
 * Gateway Supabase com filas HIGH/LOW e fila serializada por personagem.
 *
 * - HIGH: inventário, moeda, level, XP, quests → imediato.
 * - LOW: posição/mapa → buffer em memória + batch 30s / onDisconnect.
 *
 * Race conditions: fila serializada por personagem + optimistic locking em `persistence_version`
 * nos updates críticos de `profiles`; posição usa colunas isoladas (sem sobrescrever gameplay).
 */
export class PersistenceManager {
  private readonly pendingPositions = new Map<string, PendingWorldPosition>();
  private readonly writeTails = new Map<string, Promise<void>>();
  private readonly versionCache = new Map<string, number>();
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly env: ServerEnv,
    private readonly batchIntervalMs = WORLD_PERSIST_INTERVAL_MS,
  ) {}

  start(): void {
    if (this.batchTimer !== null || !this.isEnabled()) return;
    this.batchTimer = setInterval(() => {
      void this.flushAllPendingPositions('interval');
    }, this.batchIntervalMs);
  }

  stop(): void {
    if (this.batchTimer === null) return;
    clearInterval(this.batchTimer);
    this.batchTimer = null;
  }

  isEnabled(): boolean {
    return isSupabaseAdminConfigured(this.env);
  }

  /**
   * LOW_PRIORITY — armazena posição em memória; persiste em lote.
   */
  savePosition(
    scope: CharacterPersistenceScope,
    x: number,
    y: number,
    options?: {
      readonly currentMapId?: string;
      readonly facing?: string;
    },
  ): void {
    if (!this.isEnabled()) return;

    const key = scopeKey(scope);
    const existing = this.pendingPositions.get(key);
    this.pendingPositions.set(key, {
      currentMapId: options?.currentMapId ?? existing?.currentMapId ?? 'city_01',
      x,
      y,
      facing: options?.facing ?? existing?.facing ?? 'south',
      updatedAt: Date.now(),
    });
  }

  /**
   * HIGH_PRIORITY — persiste imediatamente inventário, moeda e slice de gameplay.
   */
  async saveCritical(
    scope: CharacterPersistenceScope,
    data: CriticalCharacterData,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    await this.enqueue(scope, async () => {
      const client = await getSupabaseAdminClient(this.env);
      const serverId = requireServerId(scope.serverId);

      if (data.currency) {
        const currencyResult = await upsertPlayerCurrency(
          client,
          scope.userId,
          serverId,
          data.currency.dollarVolt,
          data.currency.alterCoins,
        );
        if (!currencyResult.ok) {
          throw new Error(currencyResult.message ?? 'Falha ao persistir moeda.');
        }
      }

      if (data.inventory) {
        const inventoryResult = await upsertPlayerInventory(
          client,
          scope.userId,
          scope.characterId,
          serverId,
          data.inventory.stacks,
          data.inventory.equipped,
        );
        if (!inventoryResult.ok) {
          throw new Error(inventoryResult.message ?? 'Falha ao persistir inventário.');
        }
      }

      const profilePatch: Record<string, unknown> = {};
      if (typeof data.level === 'number') profilePatch.level = Math.max(1, Math.floor(data.level));
      if (typeof data.xpCurrent === 'number') {
        profilePatch.xp_current = Math.max(0, Math.floor(data.xpCurrent));
      }
      if (data.quests) profilePatch.quests_data = data.quests;
      if (typeof data.displayName === 'string' && data.displayName.trim()) {
        profilePatch.display_name = data.displayName.trim();
      }

      if (Object.keys(profilePatch).length > 0) {
        await this.updateProfileWithOptimisticLock(client, scope, profilePatch);
      }
    });
  }

  /** Descarrega posições pendentes de um personagem. */
  async flushPositions(
    scope: CharacterPersistenceScope,
    reason: PersistenceFlushReason,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    const key = scopeKey(scope);
    const pending = this.pendingPositions.get(key);
    if (!pending) return;

    await this.enqueue(scope, async () => {
      const client = await getSupabaseAdminClient(this.env);
      const serverId = requireServerId(scope.serverId);

      const { error } = await client
        .from('profiles')
        .update({
          current_map_id: pending.currentMapId,
          last_position_x: pending.x,
          last_position_y: pending.y,
          facing: pending.facing,
        })
        .eq('user_id', scope.userId)
        .eq('character_id', scope.characterId)
        .eq('server_id', serverId);

      if (error) {
        throw new Error(error.message);
      }

      this.pendingPositions.delete(key);
      console.info('[PersistenceManager] Posição persistida', {
        userId: scope.userId,
        characterId: scope.characterId,
        serverId,
        reason,
        mapId: pending.currentMapId,
        x: pending.x,
        y: pending.y,
      });
    });
  }

  async flushAllPendingPositions(reason: PersistenceFlushReason): Promise<void> {
    const scopes = [...this.pendingPositions.keys()].map((key) => this.scopeFromKey(key));
    await Promise.all(scopes.map((scope) => this.flushPositions(scope, reason)));
  }

  /** onDisconnect — flush LOW_PRIORITY antes de encerrar sessão. */
  async onDisconnect(scope: CharacterPersistenceScope): Promise<void> {
    await this.flushPositions(scope, 'disconnect');
  }

  resolveScope(userId: string, characterId: number, serverId: string): CharacterServerKey {
    return createCharacterServerKey(userId, serverId, characterId);
  }

  private scopeFromKey(key: string): CharacterServerKey {
    const [serverId, userId, characterIdRaw] = key.split(':');
    const characterId = Number(characterIdRaw);
    return createCharacterServerKey(userId!, serverId!, characterId);
  }

  private enqueue(scope: CharacterPersistenceScope, task: () => Promise<void>): Promise<void> {
    const key = scopeKey(scope);
    const previous = this.writeTails.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(task)
      .catch((error) => {
        console.error('[PersistenceManager] Falha na fila serializada', {
          userId: scope.userId,
          characterId: scope.characterId,
          serverId: scope.serverId,
          message: error instanceof Error ? error.message : String(error),
        });
      });

    this.writeTails.set(key, next);
    return next;
  }

  private async updateProfileWithOptimisticLock(
    client: SupabaseClient,
    scope: CharacterPersistenceScope,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const key = scopeKey(scope);
    const serverId = requireServerId(scope.serverId);

    for (let attempt = 0; attempt < MAX_OPTIMISTIC_RETRIES; attempt += 1) {
      let expectedVersion = this.versionCache.get(key);
      if (expectedVersion === undefined) {
        expectedVersion = await this.fetchPersistenceVersion(client, scope);
        this.versionCache.set(key, expectedVersion);
      }

      const nextVersion = expectedVersion + 1;
      const { data, error } = await client
        .from('profiles')
        .update({
          ...patch,
          persistence_version: nextVersion,
        })
        .eq('user_id', scope.userId)
        .eq('character_id', scope.characterId)
        .eq('server_id', serverId)
        .eq('persistence_version', expectedVersion)
        .select('persistence_version')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        this.versionCache.set(key, nextVersion);
        return;
      }

      this.versionCache.delete(key);
    }

    throw new Error('Conflito de persistência — versão do perfil mudou durante saveCritical.');
  }

  private async fetchPersistenceVersion(
    client: SupabaseClient,
    scope: CharacterPersistenceScope,
  ): Promise<number> {
    const serverId = requireServerId(scope.serverId);
    const { data, error } = await client
      .from('profiles')
      .select('persistence_version')
      .eq('user_id', scope.userId)
      .eq('character_id', scope.characterId)
      .eq('server_id', serverId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const version = (data as { persistence_version?: number } | null)?.persistence_version;
    return typeof version === 'number' ? version : 0;
  }
}
