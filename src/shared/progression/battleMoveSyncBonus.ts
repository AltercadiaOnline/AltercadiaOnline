import {
  CharacterProgressionService,
  DOMAIN_CATCH_UP_MULTIPLIER,
  DOMAIN_SYNC_RATIO_THRESHOLD,
} from './CharacterProgressionService.js';
import { resolveMoveProgressionFromMastery } from './moveProgression.js';

export {
  DOMAIN_CATCH_UP_MULTIPLIER,
  DOMAIN_SYNC_RATIO_THRESHOLD,
};

/** Multiplicador de XP de domínio — delega ao CharacterProgressionService. */
export function resolveMoveSyncXpMultiplier(
  moveLevel: number,
  characterLevel: number,
): number {
  return CharacterProgressionService.getDomainXpMultiplier(characterLevel, moveLevel);
}

export function resolveMoveDomainLevel(
  moveId: string,
  movesetMastery: Readonly<Record<string, number>>,
): number {
  return resolveMoveProgressionFromMastery(moveId, movesetMastery[moveId] ?? 0).level;
}

/** Aplica bônus de sincronia após repartição base — inteiros no grant final. */
export function applyMoveSyncBonusToMovesetGrant(
  movesetXpByMoveId: Readonly<Record<string, number>>,
  characterLevel: number,
  movesetMastery: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  if (characterLevel <= 0) return movesetXpByMoveId;

  const boosted: Record<string, number> = {};
  for (const [moveId, gained] of Object.entries(movesetXpByMoveId)) {
    if (gained <= 0) continue;
    const moveLevel = resolveMoveDomainLevel(moveId, movesetMastery);
    const mult = CharacterProgressionService.getDomainXpMultiplier(characterLevel, moveLevel);
    boosted[moveId] = Math.floor(gained * mult);
  }
  return boosted;
}
