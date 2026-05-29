import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEventType } from '../../shared/events.js';
import type { CombatState, Combatant } from '../../shared/types.js';
import { CombatEngine } from './CombatEngine.js';
import { mapEventsForClient } from './combatEventCompat.js';

function minimalState(): CombatState {
  const hero: Combatant = {
    id: 'hero',
    name: 'Hero',
    hp: 100,
    maxHp: 100,
    skills: [{ id: 'atk', name: 'Atk', damage: 20, cooldown: 1, priority: 1 }],
  };
  const enemy: Combatant = {
    id: 'enemy',
    name: 'Enemy',
    hp: 80,
    maxHp: 80,
    skills: [],
  };
  return {
    battleId: 'compat-001',
    turn: 1,
    phase: 'IDLE',
    activeActorId: null,
    combatants: { hero, enemy },
  };
}

test('Cliente: startChoosing mapeia TURN_START + SKILL_CATALOG + BATTLE_STATE_UPDATE', () => {
  const engine = new CombatEngine(minimalState());
  const events = mapEventsForClient(engine.startChoosing('hero'));
  const types = events.map((e) => e.type);
  assert.ok(types.includes(CombatEventType.TURN_START));
  assert.ok(types.includes(CombatEventType.SKILL_CATALOG));
  assert.ok(types.includes(CombatEventType.BATTLE_STATE_UPDATE));
});

test('Cliente: applyAction inclui eventos V1.2 e espelho de estado', () => {
  const engine = new CombatEngine(minimalState());
  engine.startChoosing('hero');
  const events = mapEventsForClient(
    engine.applyAction({
      battleId: 'compat-001',
      actorId: 'hero',
      turn: 1,
      skillId: 'atk',
      requestId: 'r1',
    }),
  );
  assert.ok(events.some((e) => e.type === CombatEventType.BATTLE_STATE_UPDATE));
  assert.ok(events.some((e) => e.type === CombatEventType.DAMAGE_DEALT));
  assert.ok(events.some((e) => e.type === CombatEventType.ELASTICITY_APPLIED));
});
