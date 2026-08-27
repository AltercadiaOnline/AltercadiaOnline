import { describe, expect, it } from 'vitest';
import { composeMoveVector } from './movementInput.js';
import { axisContributionFromKeyboard } from './movementInput.js';
import { composeKeyboardGridStep } from './worldMovementAxis.js';
import { DIAGONAL_SPEED_NORMALIZER } from './movementInput.js';
import { moveVectorToFacing } from './playerFacing.js';
import { facingToWireCode, wireCodeToFacing } from './worldPeerWire.js';
import { findGridPath } from './gridPathfinding.js';
import { gridStepBetween } from './gridMovement.js';

const CARDINAL = {
  up: true,
  down: false,
  left: false,
  right: false,
};

describe('movimento 8 vias', () => {
  it('WASD juntas produzem vetor diagonal unitário (mesma velocidade)', () => {
    const vector = composeMoveVector({
      up: true,
      down: false,
      left: false,
      right: true,
    });
    expect(vector).not.toBeNull();
    expect(vector!.dx).toBeCloseTo(DIAGONAL_SPEED_NORMALIZER);
    expect(vector!.dy).toBeCloseTo(-DIAGONAL_SPEED_NORMALIZER);
    expect(Math.hypot(vector!.dx, vector!.dy)).toBeCloseTo(1);
  });

  it('W sozinho continua cardinal norte', () => {
    const vector = composeMoveVector(CARDINAL);
    expect(vector).toEqual({ dx: 0, dy: -1 });
  });

  it('numpad 7 contribui norte+oeste', () => {
    expect(axisContributionFromKeyboard('', 'Numpad7')).toEqual({
      up: true,
      left: true,
    });
    const step = composeKeyboardGridStep({
      up: true,
      down: false,
      left: true,
      right: false,
    });
    expect(step).toEqual({ stepX: -1, stepY: -1 });
  });

  it('Q/E não são teclas de movimento', () => {
    expect(axisContributionFromKeyboard('q', 'KeyQ')).toBeNull();
    expect(axisContributionFromKeyboard('e', 'KeyE')).toBeNull();
  });

  it('facing 8-way a partir do vetor', () => {
    expect(moveVectorToFacing(1, -1)).toBe('north-east');
    expect(moveVectorToFacing(-1, -1)).toBe('north-west');
    expect(moveVectorToFacing(1, 1)).toBe('south-east');
    expect(moveVectorToFacing(-1, 1)).toBe('south-west');
    expect(moveVectorToFacing(0, -1)).toBe('north');
  });

  it('wire compacto preserva códigos 0–3 dos cardinais', () => {
    expect(facingToWireCode('south')).toBe(0);
    expect(facingToWireCode('north')).toBe(1);
    expect(facingToWireCode('east')).toBe(2);
    expect(facingToWireCode('west')).toBe(3);
    expect(wireCodeToFacing(4)).toBe('south-east');
  });
});

describe('pathfinding 8 vias', () => {
  it('aceita passo diagonal adjacente', () => {
    expect(gridStepBetween(
      { tileX: 2, tileY: 2 },
      { tileX: 3, tileY: 1 },
    )).toEqual({ stepX: 1, stepY: -1 });
  });

  it('BFS usa atalho diagonal em mapa aberto', () => {
    const open = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0));
    const path = findGridPath(
      open,
      { tileX: 1, tileY: 1 },
      { tileX: 3, tileY: 3 },
    );
    expect(path.length).toBe(2);
    expect(path[0]).toEqual({ tileX: 2, tileY: 2 });
    expect(path[1]).toEqual({ tileX: 3, tileY: 3 });
  });
});
