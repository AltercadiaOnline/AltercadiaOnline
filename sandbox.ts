import { CombatGateway } from './src/server/combat/CombatGateway.js';
import { GameClient } from './src/client/hud/index.js';
import { CombatEventType, type ActionRequest } from './src/shared/events.js';
import type { CombatState, Combatant, SkillData } from './src/shared/types.js';

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

const initialState: CombatState = {
  battleId: 'sandbox-battle-001',
  turn: 1,
  phase: 'IDLE',
  activeActorId: null,
  combatants: {
    [hero.id]: hero,
    [enemy.id]: enemy,
  },
};

const gateway = CombatGateway.create(initialState);
gateway.startBattle('hero');

const action: ActionRequest = {
  battleId: initialState.battleId,
  actorId: 'hero',
  turn: 1,
  skillId: 'basic_attack',
  requestId: 'sandbox-req-001',
};

GameClient.sendAction(action);

const { events, state: snapshot } = gateway.dispatchAction(action);

console.log('[sandbox] eventos:', events.map((e) => e.type));
GameClient.renderState(snapshot);

// Teste de stress: tentar atacar duas vezes no mesmo turno
const actionDupla: ActionRequest = { ...action, requestId: 'segunda-tentativa' };
const resultadoDupla = gateway.dispatchAction(actionDupla);
const rejected = resultadoDupla.events.find((e) => e.type === CombatEventType.ACTION_REJECTED);

if (rejected?.type === CombatEventType.ACTION_REJECTED) {
  console.log(
    'Resultado do ataque duplicado:',
    rejected.type,
    '→',
    rejected.payload.reason,
  );
} else {
  console.log('Resultado do ataque duplicado: aceito (inesperado para stress test)');
}
