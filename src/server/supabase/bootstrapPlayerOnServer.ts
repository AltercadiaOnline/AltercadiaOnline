import {
  applyAuthoritativeEquippedSlots,
  applyAuthoritativeWalletBalances,
  setCharacterInventoryStacks,
} from '../../Economy/economyStore.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { loadServerEnv } from '../config/env.js';
import { fetchPlayerGameDataWhenProfileReady } from './playerGameDataRepository.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';

export type ServerPlayerBootstrapResult = {
  readonly profileReady: boolean;
  readonly supabaseConfigured: true;
};

/** Espelha Supabase → economyStore; seed só via seedAuthoritativePlayerEconomyIfEmpty. */
export async function ensureServerPlayerBootstrap(
  userId: string,
  characterId: number,
): Promise<ServerPlayerBootstrapResult> {
  const env = loadServerEnv();
  const client = await getSupabaseAdminClient(env);

  const result = await fetchPlayerGameDataWhenProfileReady(client, userId, characterId);
  if (!result.profileReady) {
    console.warn('[Bootstrap] Perfil ausente no Supabase após aguardar trigger', {
      userId,
      characterId,
      message: result.message,
    });
    return { profileReady: false, supabaseConfigured: true };
  }

  const hasCurrency = Boolean(result.data?.currency);
  const hasInventory = Boolean(result.data?.inventory?.stacks?.length);

  if (hasCurrency) {
    applyAuthoritativeWalletBalances(
      userId,
      Number(result.data!.currency!.dollar_volt),
      Number(result.data!.currency!.alter_coins),
    );
  }

  if (hasInventory) {
    setCharacterInventoryStacks(userId, characterId, result.data!.inventory!.stacks);
    applyAuthoritativeEquippedSlots(userId, characterId, result.data!.inventory!.equipped ?? {});
  }

  if (!hasCurrency || !hasInventory) {
    seedAuthoritativePlayerEconomyIfEmpty(userId, characterId);
  }

  return { profileReady: true, supabaseConfigured: true };
}
