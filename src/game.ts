import { CombatGateway } from './server/combat/CombatGateway.js';
import type { ActionRequest } from './shared/events.js';
import type { CombatState, Combatant, SkillData } from './shared/types.js';

function createDefaultBattleState(): CombatState {
  const basicAttack: SkillData = {
    id: 'basic_attack',
    name: 'Ataque Básico',
    damage: 25,
    cooldown: 0,
  };

  const hero: Combatant = {
    id: 'hero',
    name: 'Hero',
    hp: 100,
    maxHp: 100,
    skills: [basicAttack],
  };

  const enemy: Combatant = {
    id: 'enemy',
    name: 'Enemy',
    hp: 80,
    maxHp: 80,
    skills: [],
  };

  return {
    battleId: 'game-battle-001',
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants: {
      [hero.id]: hero,
      [enemy.id]: enemy,
    },
  };
}

const gateway = CombatGateway.create(createDefaultBattleState(), 'hero');
gateway.startBattle('hero');

export type DispatchResult = {
  readonly events: readonly import('./shared/events.js').CombatEvent[];
  readonly state: CombatState;
};

/** API de interação do dashboard / HUD (controle remoto) — delega ao CombatGateway. */
export const GameAPI = {
  getState(): CombatState {
    return gateway.getState();
  },

  dispatchAction(action: ActionRequest): DispatchResult {
    return gateway.dispatchAction(action);
  },
};
