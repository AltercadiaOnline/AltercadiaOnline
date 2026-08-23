import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import {
  allocatedStatsFromProfile,
  allocatedStatsToProfileFields,
  tryAllocateStatPoints,
  type AllocateStatPointsSpend,
} from '../../../shared/character/characterStatPoints.js';
import {
  getAuthoritativeProgression,
  hasAuthoritativeProgressionEntry,
  patchAuthoritativeProgression,
} from '../../progression/authoritativeProgressionStore.js';
import { syncWorldVitalsHpMaxFromLoadout } from '../../world/syncWorldVitalsHpMaxFromLoadout.js';

export class AllocateStatPointsHandler extends BaseIntentHandler<AllocateStatPointsSpend> {
  readonly actionType = 'ALLOCATE_STAT_POINTS';

  async execute(playerId: string, payload: AllocateStatPointsSpend, intentId: string): Promise<void> {
    if (!hasAuthoritativeProgressionEntry(playerId, this.characterId)) {
      this.sendResponse(
        playerId,
        intentId,
        false,
        'Personagem ainda não sincronizou — reentre no mundo.',
      );
      return;
    }

    const progression = getAuthoritativeProgression(playerId, this.characterId);
    const level = Math.max(1, Math.floor(progression.characterProfile.level || 1));
    const current = allocatedStatsFromProfile(progression.characterProfile);
    const result = tryAllocateStatPoints(level, current, payload ?? {});
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }

    patchAuthoritativeProgression(playerId, this.characterId, {
      characterProfile: allocatedStatsToProfileFields(result.allocated),
    });
    const worldVitals = syncWorldVitalsHpMaxFromLoadout(playerId, this.characterId, intentId);
    this.sendResponse(playerId, intentId, true, {
      characterStatPoints: result.view,
      worldVitals,
    });
  }
}

let allocateHandler: AllocateStatPointsHandler | null = null;

export function getAllocateStatPointsHandler(): AllocateStatPointsHandler {
  if (!allocateHandler) allocateHandler = new AllocateStatPointsHandler();
  return allocateHandler;
}
