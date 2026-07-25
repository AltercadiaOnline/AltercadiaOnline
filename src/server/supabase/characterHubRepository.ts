import type { SupabaseClient } from '@supabase/supabase-js';
import { CHARACTER_SLOT_COUNT } from '../../shared/characterHub.js';
import { nextCharacterId } from '../../shared/characterCreation.js';
import type { ProfileRow } from '../../shared/supabase/gameDatabaseTypes.js';
import { requireServerId, rejectUnscopedCharacterQuery } from '../../shared/supabase/characterServerScope.js';

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
 * Aloca próximo character_id monotônico na conta (todos os shards).
 * Nunca reusa IDs deletados; evita colisão na chave RAM `${userId}:${characterId}`.
 */
export async function allocateNextCharacterId(
  client: SupabaseClient,
  userId: string,
  _serverId: string,
): Promise<number> {
  const { data, error } = await client
    .from('profiles')
    .select('character_id')
    .eq('user_id', userId)
    .order('character_id', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const existing = (data ?? [])
    .map((row) => row.character_id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return nextCharacterId(existing);
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
): Promise<void> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error('user_id obrigatório para criar personagem.');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CHARACTER_SLOT_COUNT) {
    throw new Error('Slot de personagem inválido.');
  }
  const scopedServerId = requireServerId(serverId);

  if (await slotOccupiedOnServer(client, normalizedUserId, slotIndex, scopedServerId)) {
    throw new Error('Este slot já possui um personagem.');
  }

  if (await profileExistsOnServer(client, normalizedUserId, characterId, scopedServerId)) {
    throw new Error('Identidade de personagem já existe neste servidor.');
  }

  const { error } = await client.from('profiles').insert({
    user_id: normalizedUserId,
    character_id: characterId,
    slot_index: slotIndex,
    display_name: displayName,
    server_id: scopedServerId,
    ...(email ? { email } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
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

  const { error: inventoryError } = await client
    .from('inventory')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('character_id', characterId)
    .eq('server_id', scopedServerId);

  if (inventoryError) {
    throw new Error(inventoryError.message);
  }

  const { error: currencyError } = await client
    .from('currency')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('character_id', characterId)
    .eq('server_id', scopedServerId);

  if (currencyError) {
    throw new Error(currencyError.message);
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
