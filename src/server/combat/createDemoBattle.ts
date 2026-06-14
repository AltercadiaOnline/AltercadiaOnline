import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { buildRuneManifest } from '../../shared/combat/combatRuleManifest.js';
import { monsterSkillToSkillData } from '../../shared/combat/monsterSkillCatalog.js';
import {
  getDefaultClassActiveLoadout,
  moveIdsToSkillData,
  normalizeClassActiveLoadout,
} from '../../shared/combat/movesetLoadout.js';
import type { CombatState, Combatant, SkillData } from '../../shared/types.js';
import { buildCombatantFromLoadout } from './buildCombatantFromLoadout.js';
import { getOrCreateDemoLoadout } from './localCharacterHubStore.js';
import {
  resolveEquippedRuneDurability,
  resolveRuneCombatProcsPerBattle,
} from '../../shared/items/chargedEquipment.js';

export const ratBite: SkillData = monsterSkillToSkillData('rat_bite');

export const playerSkills: readonly SkillData[] = moveIdsToSkillData(
  getDefaultClassActiveLoadout('IMPETUS'),
);

export type BattleBootstrap = {
  readonly state: CombatState;
  readonly ruleManifest: CombatRuleManifest;
  readonly loadout: PlayerCombatLoadout;
};

function buildRatEnemy(): Combatant {
  return {
    id: 'enemy_rat',
    name: 'Rato Dimensional',
    hp: 70,
    maxHp: 70,
    hpCurrent: 70,
    hpMax: 70,
    classId: 'DISSOLUTUS',
    speedProfile: { flowSpeedBase: 28 },
    skills: [ratBite],
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}

function resolveBattleSkills(loadout: PlayerCombatLoadout): SkillData[] {
  const normalized = normalizeClassActiveLoadout(loadout.classId, loadout.equippedSkillIds);
  const moveIds = normalized ?? getDefaultClassActiveLoadout(loadout.classId);
  return moveIdsToSkillData(moveIds);
}

export function createBattleFromPlayer(loadout: PlayerCombatLoadout): BattleBootstrap {
  const battleSkills = resolveBattleSkills(loadout);
  const player = buildCombatantFromLoadout(loadout, battleSkills, loadout.displayName ?? 'Operative');
  const runeDurability = resolveEquippedRuneDurability(loadout.inventory, loadout.equipped);
  const combatProcs = loadout.equipped.rune
    ? resolveRuneCombatProcsPerBattle(loadout.equipped.rune)
    : 0;
  const ruleManifest = runeDurability > 0 && loadout.equipped.rune
    ? buildRuneManifest(loadout.equipped.rune, combatProcs)
    : [];

  const state: CombatState = {
    battleId: `battle-${loadout.playerId}-${Date.now()}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants: {
      [player.id]: player,
      enemy_rat: buildRatEnemy(),
    },
  };

  return { state, ruleManifest, loadout };
}

export function createDemoBattle(playerId: string, displayName = 'Operative'): CombatState {
  const loadout = getOrCreateDemoLoadout(playerId, displayName);
  return createBattleFromPlayer(loadout).state;
}

export function createDemoBattleBootstrap(playerId: string, displayName = 'Operative'): BattleBootstrap {
  const loadout = getOrCreateDemoLoadout(playerId, displayName);
  return createBattleFromPlayer(loadout);
}

export function createDemoBattleBootstrapWithLoadout(loadout: PlayerCombatLoadout): BattleBootstrap {
  return createBattleFromPlayer(loadout);
}
