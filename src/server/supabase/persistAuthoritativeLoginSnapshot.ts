import type { ServerEnv } from '../config/env.js';
import {
  createCharacterServerKey,
  requireServerId,
  type CharacterServerKey,
} from '../../shared/supabase/characterServerScope.js';
import { exportCharacterEconomyPersistence } from '../../Economy/economyStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';
import { upsertPlayerCurrency, upsertPlayerInventory } from './playerGameDataRepository.js';

/**
 * Persiste snapshot autoritativo no Supabase no momento do login,
 * sempre dentro do contexto explícito de server_id.
 */
export async function persistAuthoritativeLoginSnapshot(
  env: ServerEnv,
  scope: CharacterServerKey,
): Promise<void> {
  const serverId = requireServerId(scope.serverId);
  const client = await getSupabaseAdminClient(env);
  const economy = exportCharacterEconomyPersistence(scope.userId, scope.characterId);
  const progression = getAuthoritativeProgression(scope.userId, scope.characterId);

  const currencyResult = await upsertPlayerCurrency(
    client,
    scope.userId,
    serverId,
    economy.wallet.dollarVolt,
    economy.wallet.alterCoins,
  );
  if (!currencyResult.ok) {
    throw new Error(currencyResult.message ?? 'Falha ao persistir carteira no login.');
  }

  const inventoryResult = await upsertPlayerInventory(
    client,
    scope.userId,
    scope.characterId,
    serverId,
    economy.profile.inventory,
    economy.profile.equipped,
  );
  if (!inventoryResult.ok) {
    throw new Error(inventoryResult.message ?? 'Falha ao persistir inventário no login.');
  }

  const displayName = progression.characterProfile.displayName?.trim();
  if (displayName) {
    const { error } = await client
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', scope.userId)
      .eq('character_id', scope.characterId)
      .eq('server_id', serverId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export function resolveLoginSnapshotScope(
  userId: string,
  serverId: string,
  characterId: number,
): CharacterServerKey {
  return createCharacterServerKey(userId, serverId, characterId);
}
