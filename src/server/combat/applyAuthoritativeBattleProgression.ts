import type { ClassType } from '../../shared/types/classes.js';
import { applyBattleProgressionGrant } from '../../shared/progression/applyBattleProgression.js';
import type { BattleProgressionGrant } from '../../shared/progression/battleProgressionGrant.js';
import {
  resolvePetInheritanceBonusesFromStacks,
  scaleBattleProgressionXp,
} from '../../shared/pet/petInheritanceBonuses.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import { exportCharacterEconomyPersistence } from '../../Economy/economyStore.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';

/** Persiste grant de vitória PVE no store autoritativo do personagem. */
export function resolveAuthoritativeBattleProgressionGrant(
  playerId: string,
  characterId: number,
  grant: BattleProgressionGrant,
): BattleProgressionGrant {
  const inventory = exportCharacterEconomyPersistence(playerId, characterId).profile.inventory;
  const inheritance = resolvePetInheritanceBonusesFromStacks(inventory);
  return scaleBattleProgressionXp(grant, inheritance.xpBonusPercent);
}

/** Persiste grant de vitória PVE no store autoritativo do personagem. */
export function applyAuthoritativeBattleProgression(
  playerId: string,
  characterId: number,
  grant: BattleProgressionGrant,
  classId: ClassType,
): void {
  if (grant.totalBattleXp <= 0) return;

  const scaledGrant = resolveAuthoritativeBattleProgressionGrant(playerId, characterId, grant);
  const state = getAuthoritativeProgression(playerId, characterId);
  const masteryWithDefaults = ensureMovesetMasteryForClass(
    state.progression.movesetMastery,
    classId,
  );
  const applied = applyBattleProgressionGrant(
    {
      level: state.characterProfile.level,
      xpCurrent: state.characterProfile.xpCurrent,
      movesetMastery: masteryWithDefaults,
      milestoneTotalProgress: state.progression.milestoneTotalProgress,
    },
    scaledGrant,
  );
  const finalMastery = ensureMovesetMasteryForClass(applied.movesetMastery, classId);

  patchAuthoritativeProgression(playerId, characterId, {
    progression: {
      movesetMastery: finalMastery,
      milestoneTotalProgress: applied.milestoneTotalProgress,
    },
    characterProfile: {
      level: applied.level,
      xpCurrent: applied.xpCurrent,
    },
  });
}
