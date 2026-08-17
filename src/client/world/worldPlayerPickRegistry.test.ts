import { describe, expect, it } from 'vitest';
import {
  playerSpriteRectContains,
  playerSpriteRectIntersectsViewport,
  resolvePlayerSpriteScreenRect,
} from './worldPlayerPickRegistry.js';

describe('worldPlayerPickRegistry', () => {
  it('sprite on-screen: pés na base, clique no corpo abre', () => {
    const rect = resolvePlayerSpriteScreenRect(320, 200, 1);
    expect(playerSpriteRectIntersectsViewport(rect)).toBe(true);
    expect(playerSpriteRectContains(rect, 320, 180)).toBe(true);
  });

  it('sprite fora da câmera não é clicável', () => {
    const rect = resolvePlayerSpriteScreenRect(-80, -80, 1);
    expect(playerSpriteRectIntersectsViewport(rect)).toBe(false);
  });
});
