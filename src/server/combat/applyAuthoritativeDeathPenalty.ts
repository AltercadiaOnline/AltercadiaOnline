import type { ClassType } from '../../shared/types/classes.js';
import {
  applyDeathPenalty,
  type DeathPenaltyOutcome,
} from '../../shared/progression/ProgressionPenaltyManager.js';
import { getDefaultClassActiveLoadout } from '../../shared/combat/movesetLoadout.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';
import { getWorldProfile } from '../world/worldProfileStore.js';

/** Aplica penalidade de derrota no store autoritativo (nível > 10). */
export function applyAuthoritativeDeathPenalty(
  playerId: string,
  characterId: number,
  classId: ClassType,
): DeathPenaltyOutcome {
  const state = getAuthoritativeProgression(playerId, characterId);
  const world = getWorldProfile(playerId, characterId);
  const equippedMovesetIds =
    world.sessionSync?.activeMovesets && world.sessionSync.activeMovesets.length > 0
      ? world.sessionSync.activeMovesets
      : getDefaultClassActiveLoadout(classId);

  const mastery = ensureMovesetMasteryForClass(state.progression.movesetMastery, classId);

  const outcome = applyDeathPenalty({
    level: state.characterProfile.level,
    xpCurrent: state.characterProfile.xpCurrent,
    equippedMovesetIds,
    movesetMastery: mastery,
    milestoneTotalProgress: state.progression.milestoneTotalProgress,
  });

  if (!outcome.applied) {
    return outcome;
  }

  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: {
      level: outcome.player.level,
      xpCurrent: outcome.player.xpCurrent,
    },
    progression: {
      movesetMastery: { ...outcome.player.movesetMastery },
      milestoneTotalProgress: outcome.player.milestoneTotalProgress,
    },
  });

  return outcome;
}
