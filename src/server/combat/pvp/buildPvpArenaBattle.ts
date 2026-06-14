import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import type { CombatRuleManifest } from '../../../shared/combat/combatRuleManifest.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import {
  getDefaultClassActiveLoadout,
  moveIdsToSkillData,
  normalizeClassActiveLoadout,
} from '../../../shared/combat/movesetLoadout.js';
import type { PvpDuelistRegistryEntry } from '../../../shared/world/pvpDuelistRegistry.js';
import type { CombatState } from '../../../shared/types.js';
import { buildCombatantFromLoadout } from '../buildCombatantFromLoadout.js';
import type { BattleBootstrap } from '../createDemoBattle.js';
import { buildPvpDuelistCombatant } from './buildPvpDuelistCombatant.js';

function resolveBattleSkills(loadout: PlayerCombatLoadout) {
  const normalized = normalizeClassActiveLoadout(loadout.classId, loadout.equippedSkillIds);
  const moveIds = normalized ?? getDefaultClassActiveLoadout(loadout.classId);
  return moveIdsToSkillData(moveIds);
}

/** Bootstrap exclusivo PVP — sem criaturas ENEMY. */
export function createPvpArenaBattleBootstrap(
  loadout: PlayerCombatLoadout,
  duelist: PvpDuelistRegistryEntry,
): BattleBootstrap {
  const player = buildCombatantFromLoadout(
    loadout,
    resolveBattleSkills(loadout),
    loadout.displayName ?? 'Operative',
  );
  const opponent = buildPvpDuelistCombatant(duelist);

  const state: CombatState = {
    battleId: `pvp-${loadout.playerId}-${Date.now()}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    battleType: BattleType.PVP,
    combatants: {
      [player.id]: player,
      [opponent.id]: opponent,
    },
  };

  const ruleManifest: CombatRuleManifest = [];

  return { state, ruleManifest, loadout };
}
