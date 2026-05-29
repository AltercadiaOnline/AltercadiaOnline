import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatUiHints, isCombatDispatchPayload } from './combatWire.js';
import type { CombatState } from './types.js';

const PLAYER = 'hero';

function state(overrides: Partial<CombatState> = {}): CombatState {
  return {
    battleId: 'b1',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: PLAYER,
    combatants: {},
    ...overrides,
  };
}

test('buildCombatUiHints: actionsEnabled só na vez do jogador em CHOOSING', () => {
  const onTurn = buildCombatUiHints(state(), PLAYER);
  assert.equal(onTurn.actionsEnabled, true);

  const enemyTurn = buildCombatUiHints(
    state({ activeActorId: 'enemy_rat', phase: 'CHOOSING' }),
    PLAYER,
  );
  assert.equal(enemyTurn.actionsEnabled, false);
  assert.equal(enemyTurn.activeActorId, 'enemy_rat');
});

test('isCombatDispatchPayload exige ui', () => {
  assert.equal(
    isCombatDispatchPayload({
      events: [],
      state: state(),
      ui: buildCombatUiHints(state(), PLAYER),
    }),
    true,
  );
  assert.equal(isCombatDispatchPayload({ events: [], state: state() }), false);
});
