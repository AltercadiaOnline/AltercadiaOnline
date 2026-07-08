import { describe, expect, it } from 'vitest';
import { RemoteEntityInterpolator } from './remoteEntityInterpolator.js';

describe('RemoteEntityInterpolator', () => {
  it('interpola linearmente entre dois keyframes', () => {
    const interpolator = new RemoteEntityInterpolator();
    interpolator.pushKeyframe({
      entityId: 'p1',
      feetX: 0,
      feetY: 0,
      facing: 'south',
      serverTimeMs: 0,
    });
    interpolator.pushKeyframe({
      entityId: 'p1',
      feetX: 100,
      feetY: 200,
      facing: 'east',
      serverTimeMs: 200,
    });

    const mid = interpolator.sample('p1', 200);
    expect(mid).not.toBeNull();
    expect(mid!.feetX).toBeCloseTo(50, 5);
    expect(mid!.feetY).toBeCloseTo(100, 5);
    expect(mid!.facing).toBe('east');
  });

  it('remove entidade ausente do buffer', () => {
    const interpolator = new RemoteEntityInterpolator();
    interpolator.pushKeyframe({
      entityId: 'gone',
      feetX: 10,
      feetY: 10,
      facing: 'north',
      serverTimeMs: 100,
    });
    interpolator.removeEntity('gone');
    expect(interpolator.sample('gone', 250)).toBeNull();
  });
});
