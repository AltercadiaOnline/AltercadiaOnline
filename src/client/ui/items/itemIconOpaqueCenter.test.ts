import { describe, expect, it } from 'vitest';
import { computeOpaqueContentOffset } from './itemIconOpaqueCenter.js';

describe('computeOpaqueContentOffset', () => {
  it('não desloca arte já centrada no canvas', () => {
    expect(computeOpaqueContentOffset(
      { x: 8, y: 8, width: 16, height: 16 },
      32,
      32,
      48,
      48,
    )).toEqual({ x: 0, y: 0 });
  });

  it('desce arte colada no topo sem mudar a escala', () => {
    const offset = computeOpaqueContentOffset(
      { x: 8, y: 0, width: 16, height: 16 },
      32,
      32,
      32,
      32,
    );
    expect(offset.x).toBe(0);
    expect(offset.y).toBeGreaterThan(0);
  });
});
