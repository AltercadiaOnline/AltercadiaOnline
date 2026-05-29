import test from 'node:test';
import assert from 'node:assert/strict';
import { isActionRequest, parseWsInbound, serializeWsOutbound } from './wsProtocol.js';

test('wsProtocol: parse combat-join e combat-action', () => {
  const join = parseWsInbound(JSON.stringify({ type: 'combat-join' }));
  assert.deepEqual(join, { type: 'combat-join' });

  const action = parseWsInbound(
    JSON.stringify({
      type: 'combat-action',
      payload: {
        battleId: 'b1',
        actorId: 'p1',
        turn: 1,
        skillId: 'atk',
        requestId: 'r1',
      },
    }),
  );
  assert.equal(action?.type, 'combat-action');
});

test('wsProtocol: isActionRequest rejeita payload inválido', () => {
  assert.equal(isActionRequest(null), false);
  assert.equal(isActionRequest({ battleId: 'x' }), false);
  assert.equal(
    isActionRequest({
      battleId: 'b',
      actorId: 'a',
      turn: 1,
      skillId: null,
      requestId: 'r',
    }),
    true,
  );
});

test('wsProtocol: serialize combat-event', () => {
  const raw = serializeWsOutbound({
    type: 'combat-error',
    payload: { reason: 'NO_SESSION' },
  });
  assert.ok(raw.includes('NO_SESSION'));
});
