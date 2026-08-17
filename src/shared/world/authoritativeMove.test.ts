import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAuthoritativeMoveToward,
  moveByDelta,
} from './movement.js';
import { clearWorldCollisionObstacles } from './worldCollisionRegistry.js';

describe('applyAuthoritativeMoveToward', () => {
  afterEach(() => {
    clearWorldCollisionObstacles();
  });

  const mapData: number[][] = Array.from({ length: 40 }, () => Array<number>(40).fill(0));
  const bounds = 1280;

  it('respeita o teto de distância (anti-teleporte)', () => {
    const next = applyAuthoritativeMoveToward(
      { x: 100, y: 100 },
      { x: 900, y: 100 },
      mapData,
      bounds,
      bounds,
      40,
    );
    expect(next.y).toBe(100);
    expect(next.x).toBeCloseTo(140, 5);
  });

  it('para no bound em vez de atravessar', () => {
    const next = moveByDelta({ x: 10, y: 10 }, -40, 0, mapData, bounds, bounds);
    expect(next.x).toBe(0);
    expect(next.y).toBe(10);
  });

  it('alvo no mesmo ponto não empurra para trás', () => {
    const from = { x: 220, y: 180 };
    const next = applyAuthoritativeMoveToward(from, from, mapData, bounds, bounds, 40);
    expect(next).toEqual(from);
  });
});
