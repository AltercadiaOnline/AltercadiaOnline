import { describe, expect, it } from 'vitest';
import { getActiveMapTileSize } from './activeMapTileSize.js';
import { reconcileAuthoritativePosition } from './playerMovementReconcile.js';

describe('reconcileAuthoritativePosition', () => {
  it('silencia drift pequeno mesmo parado', () => {
    const tile = getActiveMapTileSize();
    const result = reconcileAuthoritativePosition({
      local: { x: 100, y: 100 },
      remote: { x: 100 + tile * 0.4, y: 100 },
      isMoving: false,
    });
    expect(result.apply).toBe(false);
  });

  it('usa lerp suave em drift moderado, snap só em desync grave', () => {
    const tile = getActiveMapTileSize();
    const soft = reconcileAuthoritativePosition({
      local: { x: 100, y: 100 },
      remote: { x: 100 + tile * 2, y: 100 },
      isMoving: false,
    });
    expect(soft).toMatchObject({ apply: true, force: false, soft: true });

    const hard = reconcileAuthoritativePosition({
      local: { x: 100, y: 100 },
      remote: { x: 100 + tile * 5, y: 100 },
      isMoving: false,
    });
    expect(hard).toMatchObject({ apply: true, force: true, soft: false });
  });
});
