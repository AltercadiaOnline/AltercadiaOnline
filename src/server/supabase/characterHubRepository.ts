import type { SupabaseClient } from '@supabase/supabase-js';
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
    .order('character_id', { ascending: true });

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
  displayName: string,
  email: string | null,
  serverId: string,
): Promise<void> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error('user_id obrigatório para criar personagem.');
  }
  const scopedServerId = requireServerId(serverId);

  if (await profileExistsOnOtherServer(client, normalizedUserId, characterId, scopedServerId)) {
    throw new Error('Este slot já está vinculado a outro servidor (server_id imutável).');
  }

  if (await profileExistsOnServer(client, normalizedUserId, characterId, scopedServerId)) {
    throw new Error('Personagem já existe neste slot neste servidor.');
  }

  const { error } = await client.from('profiles').insert({
    user_id: normalizedUserId,
    character_id: characterId,
    display_name: displayName,
    server_id: scopedServerId,
    ...(email ? { email } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
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
