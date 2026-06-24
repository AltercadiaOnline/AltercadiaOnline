import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHASER_GROUND_DEPTH, resolvePhaserWorldDepth } from './phaserWorldDepth.js';

describe('phaserWorldDepth', () => {
  it('usa Y dos pés como depth inteiro', () => {
    assert.equal(resolvePhaserWorldDepth(127.9), 127);
    assert.equal(resolvePhaserWorldDepth(200), 200);
  });

  it('mantém chão em depth fixo abaixo das entidades', () => {
    assert.equal(PHASER_GROUND_DEPTH, 0);
    assert.ok(resolvePhaserWorldDepth(40) > PHASER_GROUND_DEPTH);
  });
});
