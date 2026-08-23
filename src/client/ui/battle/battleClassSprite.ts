import type { ClassType } from '../../../shared/types/classes.js';
import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  isValidPlayerSkinBundleId,
  resolvePlayerSkinBundleBattleFacingCandidates,
  resolvePlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';

/**
 * Fallback classe → bundle quando o combatant ainda não traz skinBundleId.
 * Preferir sempre a skin autoritativa do personagem.
 */
const CLASS_BATTLE_SKIN_BUNDLE: Readonly<Record<ClassType, PlayerSkinBundleId>> = {
  IMPETUS: 'player_male_1',
  COGITOR: 'player_male_2',
  TUTATOR: 'player_male_3',
  DISSOLUTUS: 'player_male_4',
};

export function resolveBattleClassSkinBundleId(classId: ClassType | string | null | undefined): PlayerSkinBundleId {
  if (classId === 'IMPETUS' || classId === 'COGITOR' || classId === 'TUTATOR' || classId === 'DISSOLUTUS') {
    return CLASS_BATTLE_SKIN_BUNDLE[classId];
  }
  return DEFAULT_PLAYER_SKIN_BUNDLE_ID;
}

/** Resolve bundle: skin do personagem → fallback por classe → default. */
export function resolveBattleFighterSkinBundleId(input: {
  readonly skinBundleId?: string | null | undefined;
  readonly classId?: string | null | undefined;
}): PlayerSkinBundleId {
  const raw = input.skinBundleId?.trim();
  if (raw && isValidPlayerSkinBundleId(raw)) {
    return raw;
  }
  return resolveBattleClassSkinBundleId(input.classId);
}

/**
 * Ally east / foe west — candidatos: rotations do mundo primeiro; `battle/` no fim (futuro).
 */
export function resolveBattleSkinFacingCandidates(
  skinBundleId: PlayerSkinBundleId | string | null | undefined,
  facing: 'east' | 'west',
  classIdFallback?: string | null,
): readonly string[] {
  const bundleId = resolveBattleFighterSkinBundleId({
    skinBundleId,
    classId: classIdFallback,
  });
  return resolvePlayerSkinBundleBattleFacingCandidates(bundleId, facing);
}

/** URL preferida = primeiro candidato (mundo east/west). */
export function resolveBattleSkinFacingUrl(
  skinBundleId: PlayerSkinBundleId | string | null | undefined,
  facing: 'east' | 'west',
  classIdFallback?: string | null,
): string {
  return resolveBattleSkinFacingCandidates(skinBundleId, facing, classIdFallback)[0]!;
}

/** @deprecated Prefer resolveBattleSkinFacingCandidates com skinBundleId. */
export function resolveBattleClassFacingCandidates(
  classId: ClassType | string | null | undefined,
  facing: 'east' | 'west',
): readonly string[] {
  return resolveBattleSkinFacingCandidates(undefined, facing, classId);
}

/** @deprecated Prefer resolveBattleSkinFacingUrl com skinBundleId. */
export function resolveBattleClassFacingUrl(
  classId: ClassType | string | null | undefined,
  facing: 'east' | 'west',
): string {
  return resolveBattleSkinFacingUrl(undefined, facing, classId);
}

export { resolvePlayerSkinBundleId };
