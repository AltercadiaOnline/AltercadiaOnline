import type { ClassType } from '../../shared/types/classes.js';
import {
  getDefaultClassActiveLoadout,
  isValidClassActiveLoadout,
  normalizeClassActiveLoadout,
} from '../../shared/combat/movesetLoadout.js';
import { inferClassIdFromMovesetMastery } from '../../shared/progression/movesetMasterySeed.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';
import { rejectLoadoutMutationIfInBattle } from './loadoutMutationGuard.js';

export type SyncMovesetResult =
  | { readonly ok: true; readonly activeMovesets: readonly string[] }
  | { readonly ok: false; readonly message: string };

/** Persiste loadout de moves confirmado pelo jogador (sessionSync). */
export function applyAuthoritativeMovesetSync(
  playerId: string,
  characterId: number,
  activeMovesets: readonly string[],
  classIdHint?: ClassType,
): SyncMovesetResult {
  const blocked = rejectLoadoutMutationIfInBattle(playerId, characterId);
  if (blocked) return blocked;

  const progression = getAuthoritativeProgression(playerId, characterId);
  const classId =
    classIdHint
    ?? inferClassIdFromMovesetMastery(progression.progression.movesetMastery)
    ?? 'IMPETUS';

  if (!isValidClassActiveLoadout(classId, activeMovesets)) {
    return { ok: false, message: 'Loadout de moves inválido para a classe atual.' };
  }

  const normalized =
    normalizeClassActiveLoadout(classId, activeMovesets)
    ?? getDefaultClassActiveLoadout(classId);

  const profile = getWorldProfile(playerId, characterId);
  saveWorldProfile(playerId, characterId, {
    ...profile,
    sessionSync: {
      ...profile.sessionSync,
      activeMovesets: [...normalized],
    },
  });

  return { ok: true, activeMovesets: normalized };
}
