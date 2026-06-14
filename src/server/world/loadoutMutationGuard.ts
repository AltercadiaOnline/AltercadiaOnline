import { isPlayerInBattle } from '../models/playerSessionRegistry.js';

export const ERR_ACTION_FORBIDDEN = 'ERR_ACTION_FORBIDDEN';

export function loadoutMutationForbiddenResult(): { readonly ok: false; readonly message: typeof ERR_ACTION_FORBIDDEN } {
  return { ok: false, message: ERR_ACTION_FORBIDDEN };
}

export function rejectLoadoutMutationIfInBattle(
  playerId: string,
  characterId: number,
): { readonly ok: false; readonly message: typeof ERR_ACTION_FORBIDDEN } | null {
  return isPlayerInBattle(playerId, characterId) ? loadoutMutationForbiddenResult() : null;
}
