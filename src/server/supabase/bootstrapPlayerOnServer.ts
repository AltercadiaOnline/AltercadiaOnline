import {
  applyAuthoritativeEquippedSlots,
  applyAuthoritativeWalletBalances,
  setCharacterInventoryStacks,
} from '../../Economy/economyStore.js';
import { hydratePetAffinityPersistence } from '../../Economy/petAffinityStore.js';
import { hydratePetRosterPersistence } from '../../Economy/petRosterStore.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { loadServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { ensureCharacterDataOnServer } from './loadCharacterData.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';
import { parseHubClassId } from '../../shared/character/characterIdentity.js';
import { createEmptyPetRoster } from '../../shared/pet/petRoster.js';
import { emptyPersistedPetAffinity } from '../../shared/persistence/characterPersistenceRecord.js';
import type { ClassType } from '../../shared/types/classes.js';

export type ServerPlayerBootstrapResult = {
  readonly profileReady: boolean;
  readonly supabaseConfigured: true;
  readonly created?: boolean;
  readonly classId?: ClassType;
};

export type ServerPlayerBootstrapOptions = {
  /** Personagem recém-criado — nunca hidrata leftover de pets. */
  readonly newCharacter?: boolean;
};

/** Espelha Supabase → economyStore/pet stores; seed só via seedAuthoritativePlayerEconomyIfEmpty. */
export async function ensureServerPlayerBootstrap(
  userId: string,
  characterId: number,
  options?: ServerPlayerBootstrapOptions,
): Promise<ServerPlayerBootstrapResult> {
  const env = loadServerEnv();
  const client = await getSupabaseAdminClient(env);
  const serverId = getServerInstanceContext().id;

  const loaded = await ensureCharacterDataOnServer(client, userId, serverId, characterId);
  if (!loaded.ok) {
    console.warn('[Bootstrap] Personagem indisponível neste shard', {
      userId,
      characterId,
      serverId,
      code: loaded.code,
      message: loaded.message,
    });
    return { profileReady: false, supabaseConfigured: true };
  }

  const result = loaded.data;
  const newCharacter = options?.newCharacter === true;
  const hasCurrency = Boolean(result.currency);
  const hasInventory = Boolean(result.inventory?.stacks?.length);

  if (!newCharacter && hasCurrency) {
    applyAuthoritativeWalletBalances(
      userId,
      characterId,
      Number(result.currency!.dollar_volt),
      Number(result.currency!.alter_coins),
    );
  }

  if (!newCharacter && hasInventory) {
    setCharacterInventoryStacks(userId, characterId, result.inventory!.stacks);
    applyAuthoritativeEquippedSlots(userId, characterId, result.inventory!.equipped ?? {});
  }

  if (newCharacter) {
    hydratePetRosterPersistence(userId, characterId, createEmptyPetRoster());
    hydratePetAffinityPersistence(userId, characterId, emptyPersistedPetAffinity());
  } else if (result.pets) {
    hydratePetRosterPersistence(userId, characterId, result.pets.roster);
    hydratePetAffinityPersistence(userId, characterId, result.pets.affinity);
  }

  // Sem dados no Supabase: inicializa vazio (não injeta demo/VOLTS).
  if (newCharacter || !hasCurrency || !hasInventory) {
    seedAuthoritativePlayerEconomyIfEmpty(userId, characterId);
  }

  const hubClassId = parseHubClassId(result.profile?.class_id);

  return {
    profileReady: true,
    supabaseConfigured: true,
    ...(loaded.created ? { created: true } : {}),
    ...(hubClassId ? { classId: hubClassId } : {}),
  };
}
