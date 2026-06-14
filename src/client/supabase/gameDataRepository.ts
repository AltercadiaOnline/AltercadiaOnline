/**
 * Zero Trust — cliente NÃO escreve em Supabase.
 * Perfil: trigger auth.users. Moedas/inventário: seed exclusivo no servidor (Vercel).
 */

const ZERO_TRUST_WRITE_ERROR =
  'Zero Trust: o cliente não pode gravar dados de jogador. Use o servidor autoritativo.';

/** @deprecated Removido — perfil criado apenas via trigger SQL em auth.users. */
export async function ensureOwnProfile(
  _characterId: number,
  _displayName?: string,
): Promise<{ ok: boolean; message?: string }> {
  return { ok: false, message: ZERO_TRUST_WRITE_ERROR };
}

/** @deprecated Removido — persistência via servidor autoritativo apenas. */
export async function upsertOwnCurrency(
  _dollarVolt: number,
  _alterCoins: number,
): Promise<{ ok: boolean; message?: string }> {
  return { ok: false, message: ZERO_TRUST_WRITE_ERROR };
}

/** @deprecated Removido — persistência via servidor autoritativo apenas. */
export async function upsertOwnInventory(
  _characterId: number,
  _stacks: readonly never[],
  _equipped: Record<string, never>,
): Promise<{ ok: boolean; message?: string }> {
  return { ok: false, message: ZERO_TRUST_WRITE_ERROR };
}
