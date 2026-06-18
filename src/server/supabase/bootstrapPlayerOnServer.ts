import {
  applyAuthoritativeEquippedSlots,
  applyAuthoritativeWalletBalances,
  setCharacterInventoryStacks,
} from '../../Economy/economyStore.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { loadServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { ensureCharacterDataOnServer } from './loadCharacterData.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';

export type ServerPlayerBootstrapResult = {
  readonly profileReady: boolean;
  readonly supabaseConfigured: true;
  readonly created?: boolean;
};

/** Espelha Supabase → economyStore; seed só via seedAuthoritativePlayerEconomyIfEmpty. */
export async function ensureServerPlayerBootstrap(
  userId: string,
  characterId: number,
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
  const hasCurrency = Boolean(result.currency);
  const hasInventory = Boolean(result.inventory?.stacks?.length);

  if (hasCurrency) {
    applyAuthoritativeWalletBalances(
      userId,
      Number(result.currency!.dollar_volt),
      Number(result.currency!.alter_coins),
    );
  }

  if (hasInventory) {
    setCharacterInventoryStacks(userId, characterId, result.inventory!.stacks);
    applyAuthoritativeEquippedSlots(userId, characterId, result.inventory!.equipped ?? {});
  }

  if (!hasCurrency || !hasInventory) {
    seedAuthoritativePlayerEconomyIfEmpty(userId, characterId);
  }

  return {
    profileReady: true,
    supabaseConfigured: true,
    ...(loaded.created ? { created: true } : {}),
  };
}
