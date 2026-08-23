import { describe, expect, it } from 'vitest';
import {
  playerInspectWorldRectContains,
  playerSpriteRectContains,
  playerSpriteRectIntersectsViewport,
  resolvePlayerInspectScreenRect,
  resolvePlayerInspectWorldRect,
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

  it('inspect: clique no nome acima da cabeça ainda pega o peer', () => {
    const feetX = 320;
    const feetY = 200;
    const sprite = resolvePlayerSpriteScreenRect(feetX, feetY, 1);
    const inspect = resolvePlayerInspectScreenRect(feetX, feetY, 1);
    expect(inspect.y).toBeLessThan(sprite.y);
    expect(inspect.width).toBeGreaterThan(sprite.width);
    expect(playerSpriteRectContains(inspect, feetX, sprite.y - 10)).toBe(true);
    expect(playerSpriteRectContains(inspect, feetX, feetY - 8)).toBe(true);
  });

  it('inspect mundo: clique nos pés e acima da cabeça pega o AABB', () => {
    const rect = resolvePlayerInspectWorldRect(400, 300);
    expect(playerInspectWorldRectContains(rect, 400, 300)).toBe(true);
    expect(playerInspectWorldRectContains(rect, 400, 300 - 54 - 10)).toBe(true);
    expect(playerInspectWorldRectContains(rect, 400, 300 - 200)).toBe(false);
  });
});
