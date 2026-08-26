import {
  applyAuthoritativeEquippedSlots,
  applyAuthoritativeWalletBalances,
  resetAuthoritativePlayerEconomyToEmpty,
  setCharacterInventoryStacks,
} from '../../Economy/economyStore.js';
import { hydratePetAffinityPersistence } from '../../Economy/petAffinityStore.js';
import { hydratePetRosterPersistence } from '../../Economy/petRosterStore.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { resetNewCharacterEconomy } from '../net/purgeCharacterRuntimeState.js';
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
  /** Perfil Supabase — reidrata progressão quando não há save em disco. */
  readonly profileLevel?: number;
  readonly profileXpCurrent?: number;
  readonly profileDisplayName?: string;
};

export type ServerPlayerBootstrapOptions = {
  /** Personagem recém-criado — wipe total; nunca hidrata leftover de inventário/pets. */
  readonly newCharacter?: boolean;
};

function forceEmptyPets(userId: string, characterId: number): void {
  hydratePetRosterPersistence(userId, characterId, createEmptyPetRoster());
  hydratePetAffinityPersistence(userId, characterId, emptyPersistedPetAffinity());
}

/**
 * Espelha Supabase → economyStore/pet stores.
 * `newCharacter: true` = isolamento absoluto (itens/pets/volts zerados).
 */
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
  const hubClassId = parseHubClassId(result.profile?.class_id);

  const profileSnapshot = result.profile
    ? {
        profileLevel: Math.max(1, Math.floor(result.profile.level || 1)),
        profileXpCurrent: Math.max(0, Math.floor(result.profile.xp_current || 0)),
        ...(result.profile.display_name?.trim()
          ? { profileDisplayName: result.profile.display_name.trim() }
          : {}),
      }
    : {};

  if (newCharacter) {
    // Defesa definitiva: nunca aplicar stacks/roster do Supabase em ficha nova.
    resetNewCharacterEconomy(userId, characterId);
    forceEmptyPets(userId, characterId);
    resetAuthoritativePlayerEconomyToEmpty(userId, characterId);
    return {
      profileReady: true,
      supabaseConfigured: true,
      ...profileSnapshot,
      ...(loaded.created ? { created: true } : {}),
      ...(hubClassId ? { classId: hubClassId } : {}),
    };
  }

  const hasCurrency = Boolean(result.currency);
  const hasInventory = Boolean(result.inventory?.stacks?.length);
  const hasPets = Boolean(result.pets?.roster?.pets?.length);

  if (hasCurrency) {
    applyAuthoritativeWalletBalances(
      userId,
      characterId,
      Number(result.currency!.dollar_volt),
      Number(result.currency!.alter_coins),
    );
  }

  if (hasInventory) {
    setCharacterInventoryStacks(userId, characterId, result.inventory!.stacks);
    applyAuthoritativeEquippedSlots(userId, characterId, result.inventory!.equipped ?? {});
  } else {
    // Sem stacks no Supabase: zera inventário/equip em RAM (não toca carteira/banco).
    setCharacterInventoryStacks(userId, characterId, []);
    applyAuthoritativeEquippedSlots(userId, characterId, {});
  }

  if (hasPets && result.pets) {
    hydratePetRosterPersistence(userId, characterId, result.pets.roster);
    hydratePetAffinityPersistence(userId, characterId, result.pets.affinity);
  } else {
    forceEmptyPets(userId, characterId);
  }

  if (!hasCurrency || !hasInventory) {
    seedAuthoritativePlayerEconomyIfEmpty(userId, characterId);
  }

  return {
    profileReady: true,
    supabaseConfigured: true,
    ...profileSnapshot,
    ...(loaded.created ? { created: true } : {}),
    ...(hubClassId ? { classId: hubClassId } : {}),
  };
}
