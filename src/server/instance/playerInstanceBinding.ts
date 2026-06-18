import type { ServerEnv } from '../config/env.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';
import { getSupabaseAdminClient } from '../supabase/supabaseAdmin.js';
import { profileExistsOnServer } from '../supabase/characterHubRepository.js';
import { getServerInstanceContext } from './ServerInstanceContext.js';

export type PlayerInstanceBindingResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: 'WRONG_SERVER'; readonly message: string };

/**
 * Valida se o personagem pertence a esta instância.
 * Vínculo rígido — sem reatribuição automática de shard.
 */
export async function assertPlayerBoundToServerInstance(
  env: ServerEnv,
  playerId: string,
  characterId: number,
  clientReportedServerId?: string,
): Promise<PlayerInstanceBindingResult> {
  const expectedServerId = requireServerId(getServerInstanceContext().id);

  if (clientReportedServerId !== undefined) {
    const reported = requireServerId(clientReportedServerId);
    if (reported !== expectedServerId) {
      return {
        ok: false,
        code: 'WRONG_SERVER',
        message: `Cliente reportou servidor "${reported}", mas este endpoint é "${expectedServerId}".`,
      };
    }
  }

  const client = await getSupabaseAdminClient(env);
  const existsOnShard = await profileExistsOnServer(
    client,
    playerId,
    characterId,
    expectedServerId,
  );

  if (!existsOnShard) {
    return {
      ok: false,
      code: 'WRONG_SERVER',
      message: `Personagem não encontrado no servidor "${expectedServerId}".`,
    };
  }

  return { ok: true };
}
