import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileRow } from '../../shared/supabase/gameDatabaseTypes.js';

export async function listProfilesForUser(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRow[]> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('character_id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfileRow[];
}

export async function profileExists(
  client: SupabaseClient,
  userId: string,
  characterId: number,
): Promise<boolean> {
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function insertProfileForCharacter(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  displayName: string,
  email: string | null,
): Promise<void> {
  const { error } = await client.from('profiles').insert({
    user_id: userId,
    character_id: characterId,
    display_name: displayName,
    ...(email ? { email } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveAccountEmail(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const profiles = await listProfilesForUser(client, userId);
  const fromProfile = profiles.find((row) => row.email)?.email ?? null;
  if (fromProfile) return fromProfile;

  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    return null;
  }
  return data.user.email;
}
