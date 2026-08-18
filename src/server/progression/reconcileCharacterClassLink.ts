import type { ClassType } from '../../shared/types/classes.js';
import {
  getDefaultClassActiveLoadout,
  normalizeClassActiveLoadout,
} from '../../shared/combat/movesetLoadout.js';
import { reconcileClassAndMovesetMastery } from '../../shared/progression/movesetMasterySeed.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from './authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from '../world/worldProfileStore.js';

/**
 * Fecha o elo player → classe → moveset após hidratar o save.
 * Hub (slot) é SSOT da classe — save leftover / IMPETUS inferido não sobrescreve.
 * Não grava IMPETUS quando a classe ainda é desconhecida.
 */
export function reconcileAuthoritativeCharacterClassLink(
  playerId: string,
  characterId: number,
  hubClassId?: ClassType | null,
): ClassType {
  const state = getAuthoritativeProgression(playerId, characterId);
  const reconciled = reconcileClassAndMovesetMastery(
    state.characterProfile.classId,
    state.progression.movesetMastery,
    hubClassId,
  );

  const classMismatch = state.characterProfile.classId !== reconciled.classId;
  if (
    !reconciled.inventedFallback
    && (reconciled.classIdWasMissing || reconciled.masteryWasPatched || classMismatch)
  ) {
    patchAuthoritativeProgression(playerId, characterId, {
      progression: { movesetMastery: reconciled.movesetMastery },
      characterProfile: { classId: reconciled.classId },
    });
  }

  if (reconciled.inventedFallback) {
    return reconciled.classId;
  }

  const profile = getWorldProfile(playerId, characterId);
  const savedMoves = profile.sessionSync?.activeMovesets;
  if (savedMoves && savedMoves.length > 0) {
    const normalized = normalizeClassActiveLoadout(reconciled.classId, savedMoves);
    if (!normalized) {
      saveWorldProfile(playerId, characterId, {
        ...profile,
        sessionSync: {
          ...profile.sessionSync,
          activeMovesets: [...getDefaultClassActiveLoadout(reconciled.classId)],
        },
      });
    }
  }

  return reconciled.classId;
}
