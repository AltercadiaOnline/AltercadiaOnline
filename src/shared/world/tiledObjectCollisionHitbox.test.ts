import { describe, expect, it } from 'vitest';
import {
  resolveTiledObjectCollisionHitbox,
  resolveTiledObjectFootCollisionHitbox,
  resolveTiledColliderFeetAnchor,
} from './tiledObjectCollisionHitbox.js';

describe('tiledObjectCollisionHitbox', () => {
  it('trata objetos com gid com (x,y) no canto inferior-esquerdo', () => {
    const object = { x: 941.333, y: 845.333, width: 144, height: 144, gid: 243 };

    expect(resolveTiledObjectCollisionHitbox(object)).toEqual({
      x: 941.333,
      y: 701.333,
      width: 144,
      height: 144,
    });

    expect(resolveTiledColliderFeetAnchor(object)).toEqual({
      feetX: 1013.333,
      feetY: 845.333,
      width: 144,
      height: 144,
    });
  });

  it('mantém retângulos sem gid com (x,y) no canto superior-esquerdo', () => {
    const object = { x: 100, y: 200, width: 64, height: 32 };

    expect(resolveTiledObjectCollisionHitbox(object)).toEqual({
      x: 100,
      y: 200,
      width: 64,
      height: 32,
    });

    expect(resolveTiledObjectFootCollisionHitbox(object)).toEqual({
      x: 100,
      y: 216,
      width: 64,
      height: 16,
    });
  });
});
