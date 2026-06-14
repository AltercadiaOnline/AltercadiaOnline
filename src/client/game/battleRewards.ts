import type {
  BattleEncounterData,
  BattleRewardSummary,
} from '../../shared/game/gameState.js';

/**
 * Legado — progressão PVE é aplicada via `progressionGrant` no COMBAT_FINISHED (servidor + espelho).
 * Mantido para contratos antigos sem duplicar XP.
 */
export function processBattleRewards(_encounter: BattleEncounterData): BattleRewardSummary {
  return { xpGained: 0, items: [], dollarVoltGained: 0 };
}
