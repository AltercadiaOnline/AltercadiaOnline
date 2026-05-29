import { CombatEventType, type CombatEvent } from '../shared/events.js';
import type { Combatant, SkillData } from '../shared/types.js';

const starterSkill: SkillData = {
  id: 'C-001',
  name: 'Corte Rápido',
  damage: 18,
  cooldown: 1,
};

const localPlayer: Combatant = {
  id: 'client-hero',
  name: 'Operative',
  hp: 90,
  maxHp: 90,
  skills: [starterSkill],
};

const mockEvent: CombatEvent = {
  type: CombatEventType.TURN_START,
  payload: {
    battleId: 'battle-v2-001',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: localPlayer.id,
    combatants: {
      [localPlayer.id]: localPlayer,
    },
  },
};

console.log('[V2][client] Hello World', mockEvent.type, localPlayer.name);
