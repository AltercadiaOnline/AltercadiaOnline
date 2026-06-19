import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassType } from '../../shared/types/classes.js';
import {
  createCharacterServerKey,
  requireServerId,
  type CharacterServerKey,
} from '../../shared/supabase/characterServerScope.js';
import type { PlayerGameDataBundle } from '../../shared/supabase/gameDatabaseTypes.js';
import {
  fetchPlayerGameDataForScope,
} from './playerGameDataRepository.js';
import {
  listProfilesForUserOnServer,
  profileExistsOnOtherServer,
  profileExistsOnServer,
} from './characterHubRepository.js';

export const STARTER_CHARACTER_ID = 1;
export const STARTER_DISPLAY_NAME = 'Operador';
export const STARTER_CLASS: ClassType = 'IMPETUS';

export type LoadCharacterDataResult =
  | {
      readonly ok: true;
      readonly scope: CharacterServerKey;
      readonly data: PlayerGameDataBundle;
      readonly created: boolean;
    }
  | {
      readonly ok: false;
      readonly code: 'WRONG_SERVER' | 'NOT_FOUND';
      readonly message: string;
    };

/**
 * Carrega dados do personagem exclusivos do shard informado.
 * Não auto-provisiona — criação explícita via POST /api/character-hub.
 */
export async function loadCharacterData(
  client: SupabaseClient,
  userId: string,
  serverId: string,
  characterId?: number,
): Promise<LoadCharacterDataResult> {
  const normalizedServerId = requireServerId(serverId);
  const profilesOnServer = await listProfilesForUserOnServer(client, userId, normalizedServerId);

  let resolvedCharacterId = characterId;
  const created = false;

  if (profilesOnServer.length === 0) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Nenhum personagem neste servidor. Crie um personagem para continuar.',
    };
  }

  if (resolvedCharacterId === undefined) {
    resolvedCharacterId = profilesOnServer[0]!.character_id;
  } else if (!profilesOnServer.some((row) => row.character_id === resolvedCharacterId)) {
    if (await profileExistsOnOtherServer(client, userId, resolvedCharacterId, normalizedServerId)) {
      return {
        ok: false,
        code: 'WRONG_SERVER',
        message: 'Este personagem pertence a outro servidor. Conecte-se ao endpoint correto.',
      };
    }

    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Personagem não encontrado neste servidor.',
    };
  }

  const scope = createCharacterServerKey(userId, normalizedServerId, resolvedCharacterId);
  const data = await fetchPlayerGameDataForScope(client, scope);

  if (!data.profile) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Perfil não encontrado neste servidor.',
    };
  }

  if (data.profile.server_id && data.profile.server_id !== normalizedServerId) {
    return {
      ok: false,
      code: 'WRONG_SERVER',
      message: 'Este personagem pertence a outro servidor.',
    };
  }

  return { ok: true, scope, data, created };
}

/** Garante que o personagem existe no shard antes de hidratar sessão/economia. */
export async function ensureCharacterDataOnServer(
  client: SupabaseClient,
  userId: string,
  serverId: string,
  characterId: number,
): Promise<LoadCharacterDataResult> {
  const normalizedServerId = requireServerId(serverId);

  if (await profileExistsOnServer(client, userId, characterId, normalizedServerId)) {
    return loadCharacterData(client, userId, normalizedServerId, characterId);
  }

  return loadCharacterData(client, userId, normalizedServerId, characterId);
}
