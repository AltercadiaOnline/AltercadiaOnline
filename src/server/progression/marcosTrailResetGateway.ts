import { TILE_SIZE } from '../../shared/world/mapConstants.js';
import { getResolvedNpcRegistry } from '../../shared/world/npcRegistry.js';
import {
  MESTRE_TRILHAS_NPC_ID,
  validateMarcosTrailResetProximity,
} from '../../shared/world/marcosTrailResetPolicy.js';
import { resetMarcoTrailAuthoritative } from '../../Economy/progressionGateway.js';
import { getWorldProfile } from '../world/worldProfileStore.js';

export type ResetMarcoTrailRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly npcId: string;
  readonly intentId?: string;
};

export type ResetMarcoTrailResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export async function applyMarcosTrailResetAtNpc(
  request: ResetMarcoTrailRequest,
): Promise<ResetMarcoTrailResult> {
  const profile = getWorldProfile(request.playerId, request.characterId);
  const npc = getResolvedNpcRegistry().find((entry) => entry.id === request.npcId);

  if (!npc || npc.id !== MESTRE_TRILHAS_NPC_ID || npc.mapId !== profile.currentMapId) {
    return { ok: false, message: 'Mestre de Trilhas não encontrado neste mapa.' };
  }

  const proximity = validateMarcosTrailResetProximity(
    {
      mapId: profile.currentMapId,
      worldX: profile.lastPosition.x,
      worldY: profile.lastPosition.y,
      npcId: request.npcId,
    },
    npc.tileX,
    npc.tileY,
    TILE_SIZE,
  );

  if (!proximity.ok) {
    return { ok: false, message: proximity.message };
  }

  const result = resetMarcoTrailAuthoritative(
    request.playerId,
    request.characterId,
    request.intentId,
  );

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true };
}
