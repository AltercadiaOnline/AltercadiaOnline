import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSession } from './CombatSession.js';
import { createDemoBattle } from './createDemoBattle.js';

const PLAYER = 'player_test';

test('CombatSession: start envia estado CHOOSING para o jogador', () => {
  const session = new CombatSession(PLAYER, createDemoBattle(PLAYER));
  const payload = session.start();
  assert.equal(payload.state.phase, 'CHOOSING');
  assert.equal(payload.state.activeActorId, PLAYER);
  assert.ok(payload.events.length > 0);
  assert.equal(payload.ui.playerActorId, PLAYER);
  assert.equal(payload.ui.activeActorId, PLAYER);
  assert.equal(payload.ui.actionsEnabled, true);
});

test('CombatSession: rejeita actorId de outro jogador', () => {
  const session = new CombatSession(PLAYER, createDemoBattle(PLAYER));
  const boot = session.start();
  const result = session.dispatchPlayerAction({
    battleId: boot.state.battleId,
    actorId: 'enemy_rat',
    turn: boot.state.turn,
    skillId: 'rat_bite',
    requestId: 'hack-1',
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, 'NOT_YOUR_ACTOR');
});

test('CombatSession: deduplica requestId', () => {
  const session = new CombatSession(PLAYER, createDemoBattle(PLAYER));
  const boot = session.start();
  const action = {
    battleId: boot.state.battleId,
    actorId: PLAYER,
    turn: boot.state.turn,
    skillId: 'strike',
    requestId: 'req-dup-1',
  };
  const first = session.dispatchPlayerAction(action);
  assert.equal(first.ok, true);
  const second = session.dispatchPlayerAction(action);
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.reason, 'DUPLICATE_REQUEST');
});

test('CombatSession: após jogada, ui.actionsEnabled reflete vez do inimigo', () => {
  const session = new CombatSession(PLAYER, createDemoBattle(PLAYER));
  const boot = session.start();
  const result = session.dispatchPlayerAction({
    battleId: boot.state.battleId,
    actorId: PLAYER,
    turn: boot.state.turn,
    skillId: 'strike',
    requestId: 'req-ui-1',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  if (result.payload.state.phase === 'ENDED') return;
  assert.equal(result.payload.ui.playerActorId, PLAYER);
  if (result.payload.ui.activeActorId === PLAYER) {
    assert.equal(result.payload.ui.actionsEnabled, true);
  } else {
    assert.equal(result.payload.ui.actionsEnabled, false);
  }
});

test('CombatSession: ação válida avança turno e pode incluir turno do inimigo', () => {
  const session = new CombatSession(PLAYER, createDemoBattle(PLAYER));
  const boot = session.start();
  const result = session.dispatchPlayerAction({
    battleId: boot.state.battleId,
    actorId: PLAYER,
    turn: boot.state.turn,
    skillId: 'strike',
    requestId: 'req-valid-1',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.payload.events.some((e) => e.type === 'DAMAGE_DEALT'));
  assert.ok(result.payload.state.turn >= 2);
});
