import { describe, expect, it } from 'vitest';
import {
  estimateRemoteServerNowMs,
  RemoteEntityInterpolator,
  REMOTE_ENTITY_RENDER_DELAY_MS,
} from './remoteEntityInterpolator.js';

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

  it('mapeia elapsed local para o relógio do servidor', () => {
    expect(estimateRemoteServerNowMs({ serverTimeMs: 1_000_000, localMs: 100 }, 150)).toBe(1_000_050);
    expect(estimateRemoteServerNowMs(null, 50)).toBe(0);
  });

  it('atrasa o sample em REMOTE_ENTITY_RENDER_DELAY_MS no mesmo relógio', () => {
    const interpolator = new RemoteEntityInterpolator();
    interpolator.pushKeyframe({
      entityId: 'p1',
      feetX: 0,
      feetY: 0,
      facing: 'south',
      serverTimeMs: 1_000,
    });
    interpolator.pushKeyframe({
      entityId: 'p1',
      feetX: 80,
      feetY: 0,
      facing: 'east',
      serverTimeMs: 1_200,
    });

    const atDelay = interpolator.sample('p1', 1_000 + REMOTE_ENTITY_RENDER_DELAY_MS);
    expect(atDelay?.feetX).toBeCloseTo(0, 5);

    const mid = interpolator.sample('p1', 1_100 + REMOTE_ENTITY_RENDER_DELAY_MS);
    expect(mid?.feetX).toBeCloseTo(40, 5);
    expect(mid?.facing).toBe('east');
  });
});
