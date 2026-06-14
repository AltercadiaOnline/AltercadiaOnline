/**
 * Zero Trust — hidratação/persistência Supabase desativada no cliente.
 * Use initializeAuthoritativePlayerSnapshot() → GET /api/player-snapshot (ready: true).
 */

import { initializeAuthoritativePlayerSnapshot } from '../auth/playerProfileClient.js';

/** @deprecated Cliente não hidrata via Supabase — use player-snapshot do servidor. */
export async function hydrateGameStoreFromSupabase(
  characterId: number,
  _displayName?: string,
): Promise<{ ok: boolean; message?: string }> {
  return initializeAuthoritativePlayerSnapshot(characterId);
}

/** @deprecated Cliente não persiste no Supabase — servidor é autoridade. */
export async function persistGameStoreToSupabase(
  _characterId: number,
): Promise<{ ok: boolean; message?: string }> {
  return { ok: false, message: 'Zero Trust: persistência apenas no servidor.' };
}
