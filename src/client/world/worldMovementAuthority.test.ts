import { afterEach, describe, expect, it } from 'vitest';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import {
  getWorldMovementAuthority,
  resetWorldMovementAuthority,
} from './worldMovementAuthority.js';

function laggedUpdate(x: number, y: number, seq: number) {
  return {
    mapId: 'city_01',
    x,
    y,
    facing: 'south' as const,
    moveSeq: seq,
  };
}

describe('WorldMovementAuthority freeze', () => {
  afterEach(() => {
    resetWorldMovementAuthority();
  });

  it('não teleporta o sprite ao soltar WASD se o servidor ainda está atrás', () => {
    const authority = getWorldMovementAuthority();
    authority.setOnlineMode(true);
    authority.setContinuousHoldActive(true);
    authority.recordPredictedStep(400, 400, 'south', 1_000);
    authority.setContinuousHoldActive(false);
    authority.freezeVisualAt(400, 400, 'south', 1_000);

    const tile = getActiveMapTileSize();
    const resolved = authority.resolveIncomingPosition(
      laggedUpdate(400 - tile * 3, 400, 1),
      1_050,
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.shouldApplyRenderTarget).toBe(false);
    expect(resolved?.shouldPublishPlayerUpdate).toBe(false);
    expect(authority.isVisualFrozen(1_050)).toBe(true);
  });

  it('libera o freeze em silêncio quando o servidor alcança os pés', () => {
    const authority = getWorldMovementAuthority();
    authority.setOnlineMode(true);
    authority.freezeVisualAt(400, 400, 'south', 1_000);

    const resolved = authority.resolveIncomingPosition(laggedUpdate(402, 401, 2), 1_080);

    expect(resolved?.shouldApplyRenderTarget).toBe(false);
    expect(authority.isVisualFrozen(1_080)).toBe(false);
  });
});
