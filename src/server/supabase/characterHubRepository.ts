import type { SupabaseClient } from '@supabase/supabase-js';
import { CHARACTER_SLOT_COUNT } from '../../shared/characterHub.js';
import { nextCharacterId } from '../../shared/characterCreation.js';
import type { ProfileRow } from '../../shared/supabase/gameDatabaseTypes.js';
import { requireServerId, rejectUnscopedCharacterQuery } from '../../shared/supabase/characterServerScope.js';
import type { ClassType } from '../../shared/types/classes.js';
import { isClassType } from '../../shared/progression/movesetMasterySeed.js';
import { wipeCharacterScopedEconomyRows } from './playerGameDataRepository.js';

export function isMissingClassIdColumnError(message: string, code?: string): boolean {
  if (code === 'PGRST204' || code === '42703') {
    return /class_id/i.test(message);
  }
  return /class_id/i.test(message)
    && (/schema cache/i.test(message) || /does not exist/i.test(message) || /could not find/i.test(message));
}

export async function listProfilesForUserOnServer(
  client: SupabaseClient,
  userId: string,
  serverId: string,
): Promise<ProfileRow[]> {
  const scopedServerId = requireServerId(serverId);
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('server_id', scopedServerId)
    .order('slot_index', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfileRow[];
}

/** @deprecated Bloqueado — use listProfilesForUserOnServer(userId, serverId). */
export async function listProfilesForUser(
  _client: SupabaseClient,
  _userId: string,
): Promise<ProfileRow[]> {
  return rejectUnscopedCharacterQuery();
}

export async function profileExistsOnServer(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<boolean> {
  const scopedServerId = requireServerId(serverId);
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .eq('server_id', scopedServerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function profileExists(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<boolean> {
  return profileExistsOnServer(client, userId, characterId, serverId);
}

/** Slot ocupado neste shard (independente do character_id). */
export async function slotOccupiedOnServer(
  client: SupabaseClient,
  userId: string,
  slotIndex: number,
  serverId: string,
): Promise<boolean> {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CHARACTER_SLOT_COUNT) {
    return true;
  }
  const scopedServerId = requireServerId(serverId);
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('server_id', scopedServerId)
    .eq('slot_index', slotIndex)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/**
 * character_id já usados pela conta (todos os shards). Delete remove a linha —
 * o teto monotonic vem da seq persistida, não só desta lista.
 */
export async function listCharacterIdsForUser(
  client: SupabaseClient,
  userId: string,
): Promise<number[]> {
  const { data, error } = await client
    .from('profiles')
    .select('character_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.character_id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id >= 1);
}

/**
 * Aloca próximo character_id monotônico na conta (todos os shards).
 * @deprecated Use listCharacterIdsForUser + allocateMonotonicCharacterId (seq + leftover).
 */
export async function allocateNextCharacterId(
  client: SupabaseClient,
  userId: string,
  _serverId: string,
): Promise<number> {
  return nextCharacterId(await listCharacterIdsForUser(client, userId));
}

/** True se este character_id já existe noutro shard (legado / inconsistência). */
export async function profileExistsOnOtherServer(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<boolean> {
  const scopedServerId = requireServerId(serverId);
  const { data, error } = await client
    .from('profiles')
    .select('server_id')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .neq('server_id', scopedServerId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

export async function insertProfileForCharacter(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  slotIndex: number,
  displayName: string,
  email: string | null,
  serverId: string,
  classId: ClassType,
): Promise<{ readonly classIdStored: boolean }> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error('user_id obrigatório para criar personagem.');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CHARACTER_SLOT_COUNT) {
    throw new Error('Slot de personagem inválido.');
  }
  if (!isClassType(classId)) {
    throw new Error('Classe inválida para criar personagem.');
  }
  const scopedServerId = requireServerId(serverId);

  if (await slotOccupiedOnServer(client, normalizedUserId, slotIndex, scopedServerId)) {
    throw new Error('Este slot já possui um personagem.');
  }

  if (await profileExistsOnServer(client, normalizedUserId, characterId, scopedServerId)) {
    throw new Error('Identidade de personagem já existe neste servidor.');
  }

  const baseRow = {
    user_id: normalizedUserId,
    character_id: characterId,
    slot_index: slotIndex,
    display_name: displayName,
    server_id: scopedServerId,
    ...(email ? { email } : {}),
  };

  const withClass = await client.from('profiles').insert({
    ...baseRow,
    class_id: classId,
  });

  if (!withClass.error) {
    return { classIdStored: true };
  }

  if (!isMissingClassIdColumnError(withClass.error.message, withClass.error.code)) {
    throw new Error(withClass.error.message);
  }

  const fallback = await client.from('profiles').insert(baseRow);
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  console.warn('[characterHub] profiles.class_id ausente — aplique supabase/migrations/018_profile_class_id.sql');
  return { classIdStored: false };
}

export async function deleteCharacterOnServer(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<boolean> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error('user_id obrigatório para excluir personagem.');
  }
  const scopedServerId = requireServerId(serverId);

  const exists = await profileExistsOnServer(
    client,
    normalizedUserId,
    characterId,
    scopedServerId,
  );
  if (!exists) {
    return false;
  }

  const wiped = await wipeCharacterScopedEconomyRows(
    client,
    normalizedUserId,
    characterId,
    scopedServerId,
  );
  if (!wiped.ok) {
    throw new Error(wiped.message ?? 'Falha ao apagar dados do personagem.');
  }

  const { error: profileError } = await client
    .from('profiles')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('character_id', characterId)
    .eq('server_id', scopedServerId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return true;
}

export async function resolveAccountEmail(
  client: SupabaseClient,
  userId: string,
  serverId: string,
): Promise<string | null> {
  const profiles = await listProfilesForUserOnServer(client, userId, serverId);
  const fromProfile = profiles.find((row) => row.email)?.email ?? null;
  if (fromProfile) return fromProfile;

  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    return null;
  }
  return data.user.email;
}
