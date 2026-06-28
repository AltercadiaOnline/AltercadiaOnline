import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { axisAlignedBoundsIntersect } from '../../../shared/world/axisAlignedBounds.js';
import { TeleportZone } from './TeleportZone.js';
import { DESIGN_CONFIG } from '../../../config/designConstants.js';

describe('axisAlignedBounds', () => {
  it('detecta overlap entre retângulos', () => {
    assert.equal(
      axisAlignedBoundsIntersect(
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 20, y: 20, width: 40, height: 40 },
      ),
      true,
    );
    assert.equal(
      axisAlignedBoundsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      ),
      false,
    );
  });
});

describe('TeleportZone', () => {
  it('usa bounding box DESIGN_CONFIG.PLAYER (35×54)', () => {
    assert.equal(TeleportZone.PLAYER_COLLIDER_WIDTH, DESIGN_CONFIG.PLAYER.WIDTH);
    assert.equal(TeleportZone.PLAYER_COLLIDER_HEIGHT, DESIGN_CONFIG.PLAYER.HEIGHT);
  });

  it('detecta jogador dentro da zona de portal', () => {
    const zone = new TeleportZone({
      portalId: 'test',
      targetMapId: 'farm_zone_01',
      targetX: 1,
      targetY: 2,
      zoneBounds: { x: 100, y: 100, width: 40, height: 40 },
    });

    assert.equal(zone.intersectsPlayer({ x: 120, y: 120 }), true);
    assert.equal(zone.intersectsPlayer({ x: 0, y: 0 }), false);
  });
});
