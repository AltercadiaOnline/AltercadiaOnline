import type { CombatState, Combatant, SkillData } from '../../shared/types.js';

const strike: SkillData = {
  id: 'strike',
  name: 'Golpe Direto',
  damage: 22,
  cooldown: 1,
  priority: 1,
};

const ratBite: SkillData = {
  id: 'rat_bite',
  name: 'Mordida',
  damage: 14,
  cooldown: 1,
  priority: 1,
};

export function createDemoBattle(playerId: string, displayName = 'Operative'): CombatState {
  const player: Combatant = {
    id: playerId,
    name: displayName,
    hp: 100,
    maxHp: 100,
    hpCurrent: 100,
    hpMax: 100,
    classId: 'IMPETUS',
    speedProfile: { flowSpeedBase: 35, activeMarcos: ['quickStep'] },
    skills: [strike],
  };

  const enemy: Combatant = {
    id: 'enemy_rat',
    name: 'Rato Dimensional',
    hp: 70,
    maxHp: 70,
    hpCurrent: 70,
    hpMax: 70,
    classId: 'DISSOLUTUS',
    speedProfile: { flowSpeedBase: 28 },
    skills: [ratBite],
  };

  return {
    battleId: `battle-${playerId}-${Date.now()}`,
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants: {
      [player.id]: player,
      [enemy.id]: enemy,
    },
  };
}
