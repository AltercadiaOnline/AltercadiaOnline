import { validateBankNpcAccess } from '../../../shared/bank/bankAccessPolicy.js';
import { getWorldProfile } from '../../world/worldProfileStore.js';

export function validateBankAccessForPlayer(
  playerId: string,
  characterId: number,
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const profile = getWorldProfile(playerId, characterId);
  if (!validateBankNpcAccess({
    mapId: profile.currentMapId,
    serverX: profile.lastPosition.x,
    serverY: profile.lastPosition.y,
  })) {
    return { ok: false, message: 'Aproxime-se do Banqueiro para usar o cofre.' };
  }
  return { ok: true };
}
