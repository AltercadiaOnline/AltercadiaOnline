import { describe, expect, it } from 'vitest';
import { SnapMovementEngine } from './snapMovementEngine.js';

describe('SnapMovementEngine', () => {
  it('aplica velocidade máxima no mesmo frame do input (impulso linear)', () => {
    const engine = new SnapMovementEngine();
    const step = engine.update({ x: 0, y: 1 }, 100, 200);
    expect(step.y).toBeCloseTo(20);
    expect(step.x).toBe(0);
    expect(engine.isMoving()).toBe(true);
  });

  it('zera velocidade no frame em que o input some', () => {
    const engine = new SnapMovementEngine();
    engine.update({ x: 1, y: 0 }, 16, 200);
    const stop = engine.update({ x: 0, y: 0 }, 16, 200);
    expect(stop).toEqual({ x: 0, y: 0 });
    expect(engine.isMoving()).toBe(false);
    expect(engine.getVelocity()).toEqual({ x: 0, y: 0 });
  });
});
