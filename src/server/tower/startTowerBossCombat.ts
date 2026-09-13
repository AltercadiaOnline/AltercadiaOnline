/**
 * Combate da Torre — bootstrap do boss por andar + pull pendente.
 */

import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { buildRuneManifest } from '../../shared/combat/combatRuleManifest.js';
import {
  moveIdsToSkillData,
  resolvePlayerEquippedSkillIds,
} from '../../shared/combat/movesetLoadout.js';
import type { CombatState, Combatant } from '../../shared/types.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { buildCombatantFromLoadout } from '../combat/buildCombatantFromLoadout.js';
import { buildPetCombatant, shouldSpawnPetInBattle } from '../combat/buildPetCombatant.js';
import { createInitialPetAllianceState } from '../../shared/combat/allianceTurnCycle.js';
import { resolvePlayerBaseForcaFromEquipped } from '../../shared/pet/petCombatScaling.js';
import {
  resolveEquippedRuneDurability,
  resolveRuneCombatProcsPerBattle,
} from '../../shared/items/chargedEquipment.js';
import type { BattleBootstrap } from '../combat/createDemoBattle.js';
import { getTowerBossDefinition } from '../../shared/tower/towerBossCatalog.js';
import { resolveTowerBossStats } from '../../shared/tower/towerPowerScaling.js';
import { monsterSkillToSkillData } from '../../shared/combat/monsterSkillCatalog.js';
import {
  getTowerPartyForPlayer,
  type TowerParty,
} from './TowerRunRuntime.js';

export type TowerBossPull = {
  readonly monsterInstanceId: string;
  readonly partyRunId: string;
  readonly floorIndex: number;
  readonly activatorPlayerId: string;
  readonly memberPlayerIds: readonly string[];
  readonly createdAtMs: number;
};

const pendingPulls = new Map<string, TowerBossPull>();
const pullByPlayer = new Map<string, string>();

export function isTowerBossMonsterInstanceId(id: string): boolean {
  return id.startsWith('tower_boss:');
}

export function getTowerBossPull(monsterInstanceId: string): TowerBossPull | null {
  return pendingPulls.get(monsterInstanceId) ?? null;
}

export function consumeTowerBossPullForPlayer(playerId: string): TowerBossPull | null {
  const id = pullByPlayer.get(playerId);
  if (!id) return null;
  return pendingPulls.get(id) ?? null;
}

export function registerTowerBossPull(party: TowerParty, activatorPlayerId: string): TowerBossPull {
  const floorIndex = party.floorIndex;
  const monsterInstanceId = `tower_boss:${floorIndex}:${party.partyRunId}`;
  const members = party.members
    .filter((m) => !party.eliminatedPlayerIds.has(m.playerId))
    .map((m) => m.playerId);
  const pull: TowerBossPull = {
    monsterInstanceId,
    partyRunId: party.partyRunId,
    floorIndex,
    activatorPlayerId,
    memberPlayerIds: members,
    createdAtMs: Date.now(),
  };
  pendingPulls.set(monsterInstanceId, pull);
  for (const pid of members) {
    pullByPlayer.set(pid, monsterInstanceId);
  }
  return pull;
}

export function clearTowerBossPull(monsterInstanceId: string): void {
  const pull = pendingPulls.get(monsterInstanceId);
  if (!pull) return;
  pendingPulls.delete(monsterInstanceId);
  for (const pid of pull.memberPlayerIds) {
    if (pullByPlayer.get(pid) === monsterInstanceId) pullByPlayer.delete(pid);
  }
}

function moveToSkill(moveId: string) {
  try {
    return monsterSkillToSkillData(moveId);
  } catch {
    return monsterSkillToSkillData('rat_bite');
  }
}

function buildBossCombatant(floorIndex: number): Combatant {
  const def = getTowerBossDefinition(floorIndex);
  const stats = resolveTowerBossStats(floorIndex);
  const actorId = `enemy_tower_boss_floor_${floorIndex}`;
  return {
    id: actorId,
    name: def ? `Guardião · Andar ${floorIndex}` : `Boss Torre ${floorIndex}`,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    hpCurrent: stats.maxHp,
    hpMax: stats.maxHp,
    level: stats.level,
    baseAttack: stats.attack,
    baseDefense: stats.defense,
    classId: 'IMPETUS',
    combatRole: 'ENEMY',
    speedProfile: { flowSpeedBase: 26 },
    skills: ['minotaur_slam', 'rat_bite'].map(moveToSkill),
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}

function applyEntryLocks(
  floorIndex: number,
  player: Combatant,
  partySize: number,
): Combatant {
  const def = getTowerBossDefinition(floorIndex);
  if (!def) return player;
  const locked = [...(player.lockedSkillIds ?? [])];

  if (def.entry.kind === 'marked_and_locked_out' && partySize === 1) {
    for (const skill of player.skills ?? []) {
      if (skill?.id) locked.push(skill.id);
    }
  }

  return {
    ...player,
    lockedSkillIds: locked,
  };
}

export function createTowerBattleBootstrap(
  loadout: PlayerCombatLoadout,
  floorIndex: number,
  options?: { readonly partySize?: number },
): BattleBootstrap {
  const battleSkills = moveIdsToSkillData(
    resolvePlayerEquippedSkillIds(loadout.classId, loadout.equippedSkillIds),
    loadout.movesetMastery ?? {},
  );
  let player = buildCombatantFromLoadout(loadout, battleSkills, loadout.displayName ?? 'Operative');
  player = applyEntryLocks(floorIndex, player, options?.partySize ?? 1);
  const boss = buildBossCombatant(floorIndex);

  const runeDurability = resolveEquippedRuneDurability(loadout.inventory, loadout.equipped);
  const combatProcs = loadout.equipped.rune
    ? resolveRuneCombatProcsPerBattle(loadout.equipped.rune)
    : 0;
  const ruleManifest: CombatRuleManifest =
    runeDurability > 0 && loadout.equipped.rune
      ? buildRuneManifest(loadout.equipped.rune, combatProcs)
      : [];

  const combatants: Record<string, Combatant> = {
    [player.id]: player,
    [boss.id]: boss,
  };

  const playerBaseForca = resolvePlayerBaseForcaFromEquipped(loadout.equipped);
  if (shouldSpawnPetInBattle(loadout.pet)) {
    const pet = buildPetCombatant(loadout.playerId, loadout.pet, playerBaseForca);
    combatants[pet.id] = pet;
  }

  const hasPet = shouldSpawnPetInBattle(loadout.pet);
  const stats = resolveTowerBossStats(floorIndex);
  const state: CombatState = {
    battleId: `tower-${floorIndex}-${loadout.playerId}-${Date.now()}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants,
    battleType: BattleType.PVE,
    pveEnemyCombatLevel: stats.level,
    pveEncounterPackSize: 1,
    ...(hasPet ? createInitialPetAllianceState() : {}),
  };

  return { state, ruleManifest, loadout };
}

export function startTowerBossCombatForParty(
  playerId: string,
  _characterId: number,
): { ok: true; battleId: string; monsterInstanceId: string } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (party.floorIndex < 1) return { ok: false, error: 'NOT_ON_FLOOR' };
  if (party.floorCleared) return { ok: false, error: 'FLOOR_ALREADY_CLEARED' };

  const pull = registerTowerBossPull(party, playerId);
  return {
    ok: true,
    battleId: pull.monsterInstanceId,
    monsterInstanceId: pull.monsterInstanceId,
  };
}
