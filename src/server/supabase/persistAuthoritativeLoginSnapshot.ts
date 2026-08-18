import type { ServerEnv } from '../config/env.js';
import {
  createCharacterServerKey,
  requireServerId,
  type CharacterServerKey,
} from '../../shared/supabase/characterServerScope.js';
import { exportCharacterEconomyPersistence } from '../../Economy/economyStore.js';
import { exportPetAffinityPersistence } from '../../Economy/petAffinityStore.js';
import { exportPetRosterPersistence } from '../../Economy/petRosterStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';
import {
  upsertPlayerCurrency,
  upsertPlayerInventory,
  upsertPlayerPets,
} from './playerGameDataRepository.js';
import { isClassType } from '../../shared/progression/movesetMasterySeed.js';
import { isMissingClassIdColumnError } from './characterHubRepository.js';

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
    scope.characterId,
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

  const petsResult = await upsertPlayerPets(
    client,
    scope.userId,
    scope.characterId,
    serverId,
    exportPetRosterPersistence(scope.userId, scope.characterId),
    exportPetAffinityPersistence(scope.userId, scope.characterId),
  );
  if (!petsResult.ok) {
    throw new Error(petsResult.message ?? 'Falha ao persistir pets no login.');
  }

  const displayName = progression.characterProfile.displayName?.trim();
  const classId = isClassType(progression.characterProfile.classId)
    ? progression.characterProfile.classId
    : null;
  if (displayName || classId) {
    const { error } = await client
      .from('profiles')
      .update({
        ...(displayName ? { display_name: displayName } : {}),
        ...(classId ? { class_id: classId } : {}),
      })
      .eq('user_id', scope.userId)
      .eq('character_id', scope.characterId)
      .eq('server_id', serverId);

    if (error) {
      if (classId && isMissingClassIdColumnError(error.message, error.code)) {
        if (displayName) {
          const retry = await client
            .from('profiles')
            .update({ display_name: displayName })
            .eq('user_id', scope.userId)
            .eq('character_id', scope.characterId)
            .eq('server_id', serverId);
          if (retry.error) {
            throw new Error(retry.error.message);
          }
        }
      } else {
        throw new Error(error.message);
      }
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
