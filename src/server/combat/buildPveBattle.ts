import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { buildRuneManifest } from '../../shared/combat/combatRuleManifest.js';
import { getMonsterByCreatureId, isBossCreatureId } from '../../shared/combat/MonsterCatalog.js';
import { getCreatureDropEntry } from '../../shared/items/creatureDrops.js';
import { ZoneId } from '../../shared/items/itemTypes.js';
import { resolveMonsterStats } from '../../shared/combat/monsterZoneScaling.js';
import { monsterSkillToSkillData } from '../../shared/combat/monsterSkillCatalog.js';
import {
  moveIdsToSkillData,
  resolvePlayerEquippedSkillIds,
} from '../../shared/combat/movesetLoadout.js';
import { getMonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import type { CombatState, Combatant, SkillData } from '../../shared/types.js';
import { buildCombatantFromLoadout } from './buildCombatantFromLoadout.js';
import { buildPetCombatant, shouldSpawnPetInBattle } from './buildPetCombatant.js';
import {
  createInitialPetAllianceState,
} from '../../shared/combat/allianceTurnCycle.js';
import { resolvePlayerBaseForcaFromEquipped } from '../../shared/pet/petCombatScaling.js';
import {
  resolveEquippedRuneDurability,
  resolveRuneCombatProcsPerBattle,
} from '../../shared/items/chargedEquipment.js';
import type { BattleBootstrap } from './createDemoBattle.js';
import { BattleType } from '../../shared/combat/battleType.js';

function moveToSkill(moveId: string): SkillData {
  try {
    return monsterSkillToSkillData(moveId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[buildPveBattle] Skill de monstro obrigatória ausente: ${moveId}. ${message}`);
  }
}

export function resolveCreatureIdForMonsterInstance(monsterInstanceId: string | undefined): string {
  if (!monsterInstanceId) return 'rat';
  const entry = getMonsterRegistryEntry(monsterInstanceId);
  return entry?.creatureId ?? 'rat';
}

export function buildEnemyActorId(creatureId: string): string {
  return `enemy_${creatureId}`;
}

function buildEnemyFromCreature(creatureId: string, playerLevel: number): Combatant {
  const catalog = getMonsterByCreatureId(creatureId);
  const drop = getCreatureDropEntry(creatureId);
  const zoneId = drop?.zoneId ?? ZoneId.Zone1;
  const stats = resolveMonsterStats(zoneId, playerLevel, isBossCreatureId(creatureId));
  const actorId = buildEnemyActorId(creatureId);
  const skills = (catalog?.skillIds ?? ['rat_bite']).map((skillId) => moveToSkill(skillId));

  return {
    id: actorId,
    name: catalog?.name ?? 'Criatura',
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    hpCurrent: stats.maxHp,
    hpMax: stats.maxHp,
    baseAttack: stats.attack,
    classId: stats.classId,
    speedProfile: { flowSpeedBase: stats.flowSpeedBase },
    skills,
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}

function resolveBattleSkills(loadout: PlayerCombatLoadout): SkillData[] {
  const moveIds = resolvePlayerEquippedSkillIds(loadout.classId, loadout.equippedSkillIds);
  return moveIdsToSkillData(moveIds, loadout.movesetMastery ?? {});
}

export function createPveBattleBootstrap(
  loadout: PlayerCombatLoadout,
  monsterInstanceId?: string,
): BattleBootstrap {
  const creatureId = resolveCreatureIdForMonsterInstance(monsterInstanceId);
  const battleSkills = resolveBattleSkills(loadout);
  const player = buildCombatantFromLoadout(loadout, battleSkills, loadout.displayName ?? 'Operative');
  const enemy = buildEnemyFromCreature(creatureId, loadout.level ?? 1);
  const runeDurability = resolveEquippedRuneDurability(loadout.inventory, loadout.equipped);
  const combatProcs = loadout.equipped.rune
    ? resolveRuneCombatProcsPerBattle(loadout.equipped.rune)
    : 0;
  const ruleManifest = runeDurability > 0 && loadout.equipped.rune
    ? buildRuneManifest(loadout.equipped.rune, combatProcs)
    : [];

  const combatants: Record<string, Combatant> = {
    [player.id]: player,
    [enemy.id]: { ...enemy, combatRole: 'ENEMY' },
  };

  const playerBaseForca = resolvePlayerBaseForcaFromEquipped(loadout.equipped);

  if (shouldSpawnPetInBattle(loadout.pet)) {
    const pet = buildPetCombatant(loadout.playerId, loadout.pet, playerBaseForca);
    combatants[pet.id] = pet;
  }

  const hasPet = shouldSpawnPetInBattle(loadout.pet);
  const state: CombatState = {
    battleId: `battle-${loadout.playerId}-${Date.now()}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants,
    battleType: BattleType.PVE,
    ...(hasPet ? createInitialPetAllianceState() : {}),
  };

  return { state, ruleManifest, loadout };
}
