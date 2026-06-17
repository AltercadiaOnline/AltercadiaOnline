import type { CombatClassId } from '../../shared/types.js';
import type { WorldExplorationSessionSync } from '../../shared/world/zoneTransition.js';
import { getDefaultClassActiveLoadout, normalizeClassActiveLoadout } from '../../shared/combat/movesetLoadout.js';
import { inferClassIdFromMovesetMastery } from '../../shared/progression/movesetMasterySeed.js';
import { mergeVitalsForHealCheck } from '../../shared/world/resolveHealNpcVitals.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from '../world/worldProfileStore.js';

export type CombatJoinSessionSyncInput = {
  readonly classId?: CombatClassId;
  readonly activeMovesets?: readonly string[];
  readonly worldVitals?: WorldExplorationSessionSync['worldVitals'];
  readonly pet?: WorldExplorationSessionSync['pet'];
};

/** Persiste snapshot de sessão enviado no combat-join antes do bootstrap da batalha. */
export function applyCombatJoinSessionSync(
  playerId: string,
  characterId: number,
  join: CombatJoinSessionSyncInput,
): void {
  const profile = getWorldProfile(playerId, characterId);
  let sessionSync: WorldExplorationSessionSync = { ...(profile.sessionSync ?? {}) };

  if (join.worldVitals) {
    const { hpCurrent, hpMax, mpCurrent, mpMax } = join.worldVitals;
    if (
      Number.isFinite(hpCurrent)
      && Number.isFinite(hpMax)
      && Number.isFinite(mpCurrent)
      && Number.isFinite(mpMax)
    ) {
      const serverVitals = sessionSync.worldVitals ?? {
        hpCurrent,
        hpMax,
        mpCurrent,
        mpMax,
      };
      sessionSync = {
        ...sessionSync,
        worldVitals: mergeVitalsForHealCheck(serverVitals, join.worldVitals),
      };
    }
  }

  if (join.activeMovesets?.length) {
    const progression = getAuthoritativeProgression(playerId, characterId);
    const inferredClass =
      inferClassIdFromMovesetMastery(progression.progression.movesetMastery) ?? 'IMPETUS';
    const classId = join.classId ?? inferredClass;
    const normalized =
      normalizeClassActiveLoadout(classId, join.activeMovesets)
      ?? getDefaultClassActiveLoadout(classId);
    if (!normalizeClassActiveLoadout(classId, join.activeMovesets)) {
      console.warn('[CombatJoin] Loadout do cliente inválido para a classe — usando fallback autoritativo', {
        playerId,
        characterId,
        classId,
        received: join.activeMovesets,
        applied: normalized,
      });
    }
    sessionSync = { ...sessionSync, activeMovesets: normalized };
  }

  if (join.pet !== undefined) {
    sessionSync = { ...sessionSync, pet: join.pet };
  }

  saveWorldProfile(playerId, characterId, {
    ...profile,
    sessionSync,
  });
}
