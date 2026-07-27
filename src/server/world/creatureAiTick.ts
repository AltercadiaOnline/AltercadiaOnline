/**
 * Wrapper servidor — mesma AI shared (`creatureWanderConfig`) + claim PVE.
 */

import {
  tickCreatureWanderAi as tickSharedCreatureWanderAi,
  clearCreatureAiRuntime,
  __resetCreatureAiForTests,
  type CreatureAiPlayerProbe,
  type TickCreatureWanderAiOptions,
} from '../../shared/world/creatureAiTick.js';
import { isMonsterEncounterClaimed } from './pveMonsterClaim.js';

export type { CreatureAiPlayerProbe, TickCreatureWanderAiOptions };
export { clearCreatureAiRuntime, __resetCreatureAiForTests };

export function tickCreatureWanderAi(
  nowMs: number,
  players: readonly CreatureAiPlayerProbe[],
): number {
  return tickSharedCreatureWanderAi(nowMs, players, {
    isEncounterClaimed: isMonsterEncounterClaimed,
  });
}
