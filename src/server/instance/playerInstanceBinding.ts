import type { ServerEnv } from '../config/env.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';
import { getSupabaseAdminClient } from '../supabase/supabaseAdmin.js';
import {
  findProfileForUserCharacter,
  profileExistsOnServer,
  updateProfileLastWorldId,
} from '../supabase/characterHubRepository.js';
import { getServerInstanceContext } from './ServerInstanceContext.js';

export type PlayerInstanceBindingResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: 'WRONG_SERVER'; readonly message: string };

/**
 * Valida personagem da conta neste endpoint e atualiza last_world_id (hop).
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
  const profile = await findProfileForUserCharacter(client, playerId, characterId);
  if (!profile) {
    return {
      ok: false,
      code: 'WRONG_SERVER',
      message: 'Personagem não encontrado nesta conta.',
    };
  }

  const existsOnShard = await profileExistsOnServer(
    client,
    playerId,
    characterId,
    expectedServerId,
  );

  if (!existsOnShard) {
    await updateProfileLastWorldId(client, playerId, characterId, expectedServerId);
  }

  return { ok: true };
}
