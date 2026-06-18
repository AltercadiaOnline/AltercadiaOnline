import type { SupabaseClient } from '@supabase/supabase-js';
import type { EquippedSlots, InventoryStack } from '../../shared/character/equipmentState.js';
import {
  createCharacterServerKey,
  requireServerId,
  rejectUnscopedCharacterQuery,
  ARCHITECTURE_SERVER_ID_REQUIRED,
  type CharacterServerKey,
} from '../../shared/supabase/characterServerScope.js';
import {
  parseEquippedSlots,
  parseInventoryStacks,
  type CurrencyRow,
  type InventoryRow,
  type PlayerGameDataBundle,
  type ProfileRow,
} from '../../shared/supabase/gameDatabaseTypes.js';

const DEFAULT_PROFILE_WAIT_ATTEMPTS = 12;
const DEFAULT_PROFILE_WAIT_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function profileExistsForUser(
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

/** Aguarda profile visível no shard (race após insert / trigger). */
export async function waitForUserProfileOnServer(
  client: SupabaseClient,
  scope: CharacterServerKey,
  options?: {
    readonly maxAttempts?: number;
    readonly delayMs?: number;
  },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_PROFILE_WAIT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_PROFILE_WAIT_DELAY_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await profileExistsForUser(client, scope.userId, scope.characterId, scope.serverId)) {
      return true;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

export async function fetchPlayerGameDataForScope(
  client: SupabaseClient,
  scope: CharacterServerKey,
): Promise<PlayerGameDataBundle> {
  const scopedServerId = requireServerId(scope.serverId);
  if (!scope.userId?.trim()) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }
  const [profileRes, currencyRes, inventoryRes] = await Promise.all([
    client
      .from('profiles')
      .select('*')
      .eq('user_id', scope.userId)
      .eq('character_id', scope.characterId)
      .eq('server_id', scopedServerId)
      .maybeSingle(),
    client
      .from('currency')
      .select('*')
      .eq('user_id', scope.userId)
      .eq('server_id', scopedServerId)
      .maybeSingle(),
    client
      .from('inventory')
      .select('*')
      .eq('user_id', scope.userId)
      .eq('character_id', scope.characterId)
      .eq('server_id', scopedServerId)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (currencyRes.error) throw new Error(currencyRes.error.message);
  if (inventoryRes.error) throw new Error(inventoryRes.error.message);

  const inventoryRow = inventoryRes.data as InventoryRow | null;
  const normalizedInventory = inventoryRow
    ? {
        ...inventoryRow,
        stacks: parseInventoryStacks(inventoryRow.stacks),
        equipped: parseEquippedSlots(inventoryRow.equipped),
      }
    : null;

  return {
    profile: (profileRes.data as ProfileRow | null) ?? null,
    currency: (currencyRes.data as CurrencyRow | null) ?? null,
    inventory: normalizedInventory,
  };
}

/** @deprecated Bloqueado — use fetchPlayerGameDataForScope(scope). */
export async function fetchPlayerGameData(
  _client: SupabaseClient,
  _userId: string,
  _characterId: number,
  _serverId?: string,
): Promise<PlayerGameDataBundle> {
  return rejectUnscopedCharacterQuery();
}

export async function provisionStarterCharacterOnServer(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<PlayerGameDataBundle> {
  const scopedServerId = requireServerId(serverId);
  const scope = createCharacterServerKey(userId, scopedServerId, characterId);

  const { error } = await client.rpc('bootstrap_player_game_data', {
    p_user_id: userId,
    p_character_id: characterId,
    p_server_id: scopedServerId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const ready = await waitForUserProfileOnServer(client, scope);
  if (!ready) {
    throw new Error('Perfil inicial não provisionado a tempo.');
  }

  return fetchPlayerGameDataForScope(client, scope);
}

/** Leitura autoritativa no shard — sem auto-provision (use loadCharacterData). */
export async function fetchPlayerGameDataWhenProfileReady(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
): Promise<{ ok: boolean; data?: PlayerGameDataBundle; message?: string; profileReady?: boolean }> {
  const scopedServerId = requireServerId(serverId);
  const scope = createCharacterServerKey(userId, scopedServerId, characterId);
  const profileReady = await waitForUserProfileOnServer(client, scope);
  if (!profileReady) {
    return {
      ok: false,
      profileReady: false,
      message: 'Perfil não provisionado neste servidor.',
    };
  }

  try {
    const data = await fetchPlayerGameDataForScope(client, scope);
    return { ok: true, data, profileReady: true };
  } catch (error) {
    return {
      ok: false,
      profileReady: true,
      message: error instanceof Error ? error.message : 'Falha ao carregar dados do jogador.',
    };
  }
}

export async function upsertPlayerCurrency(
  client: SupabaseClient,
  userId: string,
  serverId: string,
  dollarVolt: number,
  alterCoins: number,
): Promise<{ ok: boolean; message?: string }> {
  const scopedServerId = requireServerId(serverId);
  const { error } = await client.from('currency').upsert(
    {
      user_id: userId,
      server_id: scopedServerId,
      dollar_volt: Math.max(0, Math.floor(dollarVolt)),
      alter_coins: Math.max(0, Math.floor(alterCoins)),
    },
    { onConflict: 'user_id,server_id' },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function upsertPlayerInventory(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  serverId: string,
  stacks: readonly InventoryStack[],
  equipped: EquippedSlots,
): Promise<{ ok: boolean; message?: string }> {
  const scopedServerId = requireServerId(serverId);
  const { error } = await client.from('inventory').upsert(
    {
      user_id: userId,
      character_id: characterId,
      server_id: scopedServerId,
      stacks,
      equipped,
    },
    { onConflict: 'user_id,character_id,server_id' },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
