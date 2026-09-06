import type { ClassType } from '../../shared/types/classes.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import { ensureMovesetMasteryForClass, isClassType } from '../../shared/progression/movesetMasterySeed.js';
import {
  allocatedStatsFromProfile,
  allocatedStatsToProfileFields,
} from '../../shared/character/characterStatPoints.js';
import {
  isValidPlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../shared/character/playerSkinBundle.js';
import {
  getAuthoritativeProgression,
  hasAuthoritativeProgressionEntry,
  loadAuthoritativeProgression,
  patchAuthoritativeProgression,
} from './authoritativeProgressionStore.js';

export type EnsureAuthoritativeProgressionSessionInput = {
  readonly hadPersistedSave: boolean;
  readonly classId?: ClassType | null | undefined;
  readonly displayName?: string | undefined;
  readonly level?: number | undefined;
  readonly xpCurrent?: number | undefined;
  /** Preenche lacuna de skin (create/hub); não sobrescreve skin já válida no save. */
  readonly skinBundleId?: string | null | undefined;
};

function resolveSessionSkinBundleId(
  existing: string | undefined,
  input: string | null | undefined,
): PlayerSkinBundleId | undefined {
  if (typeof existing === 'string' && isValidPlayerSkinBundleId(existing)) {
    return existing;
  }
  if (typeof input === 'string' && isValidPlayerSkinBundleId(input.trim())) {
    return input.trim() as PlayerSkinBundleId;
  }
  return undefined;
}

/**
 * Garante entrada de progressão após world-login.
 * Sem save em disco o reset zera a RAM — reidrata nível/XP do Supabase para a bolsa bater.
 */
export function ensureAuthoritativeProgressionSession(
  playerId: string,
  characterId: number,
  input: EnsureAuthoritativeProgressionSessionInput,
): void {
  const existing = hasAuthoritativeProgressionEntry(playerId, characterId)
    ? getAuthoritativeProgression(playerId, characterId)
    : null;
  const skinBundleId = resolveSessionSkinBundleId(
    existing?.characterProfile.skinBundleId,
    input.skinBundleId,
  );

  if (input.hadPersistedSave && existing) {
    // Save ok, mas skin pode ter faltado em saves antigos — preenche lacuna sem resetar XP.
    if (skinBundleId && !existing.characterProfile.skinBundleId) {
      patchAuthoritativeProgression(playerId, characterId, {
        characterProfile: { skinBundleId },
      });
    }
    return;
  }

  const hubClass = input.classId && isClassType(input.classId) ? input.classId : undefined;
  const level = Math.max(
    1,
    Math.floor(input.level ?? existing?.characterProfile.level ?? 1),
  );
  const xpCurrent = Math.max(
    0,
    Math.floor(input.xpCurrent ?? existing?.characterProfile.xpCurrent ?? 0),
  );
  const displayName = input.displayName?.trim()
    || existing?.characterProfile.displayName?.trim();
  const classId = hubClass ?? existing?.characterProfile.classId;

  if (!existing) {
    const baseProgression = createDefaultPlayerProgressionData();
    const movesetMastery = classId
      ? ensureMovesetMasteryForClass(baseProgression.movesetMastery, classId)
      : baseProgression.movesetMastery;

    loadAuthoritativeProgression(playerId, characterId, {
      progression: {
        ...baseProgression,
        movesetMastery,
      },
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level,
        xpCurrent,
        ...(displayName ? { displayName } : {}),
        ...(classId ? { classId } : {}),
        ...(skinBundleId ? { skinBundleId } : {}),
      },
    });
    return;
  }

  const allocated = allocatedStatsToProfileFields(
    allocatedStatsFromProfile(existing.characterProfile),
  );

  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: {
      level,
      xpCurrent,
      ...allocated,
      ...(classId ? { classId } : {}),
      ...(displayName ? { displayName } : {}),
      ...(skinBundleId && !existing.characterProfile.skinBundleId
        ? { skinBundleId }
        : {}),
    },
  });
}
