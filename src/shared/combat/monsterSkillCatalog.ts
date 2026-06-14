import type { SkillData } from '../types.js';
import { MoveCategory, MoveScalingStat, type MoveDefinition } from './moveTypes.js';

/** Skills de criaturas — fora do moveset de classe do jogador. */
export const MONSTER_SKILL_CATALOG: readonly MoveDefinition[] = [
  {
    id: 'rat_bite',
    name: 'Mordida',
    category: MoveCategory.Attack,
    scalingStat: MoveScalingStat.STR,
    damage: 14,
    cooldown: 1,
    priority: 1,
    ppMax: 20,
    description: 'Ataque básico de criatura.',
  },
];

const BY_ID = new Map(MONSTER_SKILL_CATALOG.map((skill) => [skill.id, skill]));

export function getMonsterSkillById(id: string): MoveDefinition | undefined {
  return BY_ID.get(id);
}

export function isMonsterSkillId(id: string): boolean {
  return BY_ID.has(id);
}

export function monsterSkillToSkillData(skillId: string): SkillData {
  const move = getMonsterSkillById(skillId);
  if (!move) {
    throw new Error(`[Combat] Skill de monstro desconhecida: ${skillId}`);
  }

  let skill: SkillData = {
    id: move.id,
    name: move.name,
    damage: move.damage,
    cooldown: move.cooldown,
    basePower: move.damage,
    category: move.category,
    scalingStat: move.scalingStat,
  };

  if (move.priority !== undefined) {
    skill = { ...skill, priority: move.priority };
  }
  if (move.ppMax !== undefined) {
    skill = { ...skill, ppCurrent: move.ppMax, ppMax: move.ppMax };
  }

  return skill;
}
