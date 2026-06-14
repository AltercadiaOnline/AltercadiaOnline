import type { PetSnapshot } from '../../shared/pet/petModel.js';
import { canPetEnterBattle } from '../../shared/pet/petModel.js';
import { getPetDefinition } from '../../shared/pet/petCatalog.js';
import {
  resolvePetBattleHpMax,
  resolvePetBattleSkillDamage,
} from '../../shared/pet/petCombatScaling.js';
import {
  buildPetActorId,
} from '../../shared/pet/petCombatRules.js';
import type { ActionRequest, ResolvedCombatAction } from '../../shared/events.js';
import type { Combatant } from '../../shared/types.js';

export function buildPetCombatant(
  ownerPlayerId: string,
  pet: PetSnapshot,
  playerBaseForca: number,
): Combatant {
  const id = buildPetActorId(ownerPlayerId);
  const def = getPetDefinition(pet.kindId);
  const battleHpMax = resolvePetBattleHpMax(playerBaseForca, pet.hpMax);
  const hpCurrent = pet.status === 'INACTIVE'
    ? 0
    : Math.max(0, Math.min(battleHpMax, pet.hpCurrent));
  const battleDamage = resolvePetBattleSkillDamage(playerBaseForca, pet);

  return {
    id,
    name: pet.name,
    hp: hpCurrent,
    maxHp: battleHpMax,
    hpCurrent,
    hpMax: battleHpMax,
    combatRole: 'PET',
    ownerPlayerId,
    petStatus: pet.status,
    petKindId: pet.kindId,
    petColorId: pet.colorId,
    petGenderId: pet.gender,
    speedProfile: { flowSpeedBase: def.flowSpeedBase },
    skills: [{
      id: def.attackSkillId,
      name: def.attackSkillName,
      damage: battleDamage,
      cooldown: 0,
      priority: def.attackPriority,
    }],
    combatStats: { ...def.combatStats },
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}

export function shouldSpawnPetInBattle(pet: PetSnapshot | null | undefined): pet is PetSnapshot {
  return Boolean(pet && canPetEnterBattle(pet));
}

export function buildPetBasicAttackRequest(
  battleId: string,
  turn: number,
  petActorId: string,
  pet: PetSnapshot,
  requestIdSeed: string,
): ResolvedCombatAction {
  const def = getPetDefinition(pet.kindId);
  return {
    battleId,
    actorId: petActorId,
    turn,
    skillId: def.attackSkillId,
    requestId: `pet-${requestIdSeed}`,
    priorityHint: def.attackPriority,
  };
}
