/**
 * Bootstrap PVP rankeado — dois loadouts PLAYER reais (sem ENEMY).
 */

import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import type { CombatRuleManifest } from '../../../shared/combat/combatRuleManifest.js';
import { buildRuneManifest } from '../../../shared/combat/combatRuleManifest.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import {
  moveIdsToSkillData,
  resolvePlayerEquippedSkillIds,
} from '../../../shared/combat/movesetLoadout.js';
import {
  resolveEquippedRuneDurability,
  resolveRuneCombatProcsPerBattle,
} from '../../../shared/items/chargedEquipment.js';
import { resolvePlayerBaseForcaFromEquipped } from '../../../shared/pet/petCombatScaling.js';
import type { CombatState, Combatant } from '../../../shared/types.js';
import { buildCombatantFromLoadout } from '../buildCombatantFromLoadout.js';
import { buildPetCombatant, shouldSpawnPetInBattle } from '../buildPetCombatant.js';
import type { BattleBootstrap } from '../createDemoBattle.js';

function resolveBattleSkills(loadout: PlayerCombatLoadout) {
  const moveIds = resolvePlayerEquippedSkillIds(loadout.classId, loadout.equippedSkillIds);
  return moveIdsToSkillData(moveIds, loadout.movesetMastery ?? {});
}

function mergeRuneManifest(loadout: PlayerCombatLoadout): CombatRuleManifest {
  const runeDurability = resolveEquippedRuneDurability(loadout.inventory, loadout.equipped);
  const combatProcs = loadout.equipped.rune
    ? resolveRuneCombatProcsPerBattle(loadout.equipped.rune)
    : 0;
  if (runeDurability <= 0 || !loadout.equipped.rune) return [];
  return buildRuneManifest(loadout.equipped.rune, combatProcs);
}

function estimateInitiativeScore(loadout: PlayerCombatLoadout): number {
  return (loadout.flowSpeedBase ?? 30) + (loadout.level ?? 1);
}

export type PvpRankedBattleBootstrap = BattleBootstrap & {
  readonly actorAId: string;
  readonly actorBId: string;
  readonly firstActorId: string;
};

/** Monta estado inicial PLAYER vs PLAYER para duelo rankeado. */
export function createPvpRankedBattleBootstrap(
  loadoutA: PlayerCombatLoadout,
  loadoutB: PlayerCombatLoadout,
  matchId: string,
): PvpRankedBattleBootstrap {
  const playerA = buildCombatantFromLoadout(
    loadoutA,
    resolveBattleSkills(loadoutA),
    loadoutA.displayName ?? 'Operative A',
  );
  const playerB = buildCombatantFromLoadout(
    loadoutB,
    resolveBattleSkills(loadoutB),
    loadoutB.displayName ?? 'Operative B',
  );

  const combatants: Record<string, Combatant> = {
    [playerA.id]: playerA,
    [playerB.id]: playerB,
  };

  if (shouldSpawnPetInBattle(loadoutA.pet)) {
    const pet = buildPetCombatant(
      loadoutA.playerId,
      loadoutA.pet,
      resolvePlayerBaseForcaFromEquipped(loadoutA.equipped),
    );
    combatants[pet.id] = pet;
  }
  if (shouldSpawnPetInBattle(loadoutB.pet)) {
    const pet = buildPetCombatant(
      loadoutB.playerId,
      loadoutB.pet,
      resolvePlayerBaseForcaFromEquipped(loadoutB.equipped),
    );
    combatants[pet.id] = pet;
  }

  const firstActorId =
    estimateInitiativeScore(loadoutA) >= estimateInitiativeScore(loadoutB)
      ? playerA.id
      : playerB.id;

  const state: CombatState = {
    battleId: `ranked-${matchId}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    battleType: BattleType.PVP,
    combatants,
  };

  const ruleManifest: CombatRuleManifest = [
    ...mergeRuneManifest(loadoutA),
    ...mergeRuneManifest(loadoutB),
  ];

  return {
    state,
    ruleManifest,
    loadout: loadoutA,
    actorAId: playerA.id,
    actorBId: playerB.id,
    firstActorId,
  };
}
