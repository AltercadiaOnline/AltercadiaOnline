import type { SupabaseClient } from '@supabase/supabase-js';
import type { EquippedSlots, InventoryStack } from '../../shared/character/equipmentState.js';
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

/** Aguarda trigger auth.users → profiles (race após OAuth). */
export async function waitForUserProfile(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  options?: {
    readonly maxAttempts?: number;
    readonly delayMs?: number;
  },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_PROFILE_WAIT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_PROFILE_WAIT_DELAY_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await profileExistsForUser(client, userId, characterId)) {
      return true;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

export async function fetchPlayerGameData(
  client: SupabaseClient,
  userId: string,
  characterId: number,
): Promise<PlayerGameDataBundle> {
  const [profileRes, currencyRes, inventoryRes] = await Promise.all([
    client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle(),
    client.from('currency').select('*').eq('user_id', userId).maybeSingle(),
    client
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .eq('character_id', characterId)
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

/** Leitura autoritativa — sem RPC bootstrap (DB populado via trigger + seed servidor). */
export async function fetchPlayerGameDataWhenProfileReady(
  client: SupabaseClient,
  userId: string,
  characterId: number,
): Promise<{ ok: boolean; data?: PlayerGameDataBundle; message?: string; profileReady?: boolean }> {
  const profileReady = await waitForUserProfile(client, userId, characterId);
  if (!profileReady) {
    return {
      ok: false,
      profileReady: false,
      message: 'Perfil não provisionado — aguarde o trigger auth.users.',
    };
  }

  try {
    const data = await fetchPlayerGameData(client, userId, characterId);
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
  dollarVolt: number,
  alterCoins: number,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await client.from('currency').upsert(
    {
      user_id: userId,
      dollar_volt: Math.max(0, Math.floor(dollarVolt)),
      alter_coins: Math.max(0, Math.floor(alterCoins)),
    },
    { onConflict: 'user_id' },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function upsertPlayerInventory(
  client: SupabaseClient,
  userId: string,
  characterId: number,
  stacks: readonly InventoryStack[],
  equipped: EquippedSlots,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await client.from('inventory').upsert(
    {
      user_id: userId,
      character_id: characterId,
      stacks,
      equipped,
    },
    { onConflict: 'user_id,character_id' },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
