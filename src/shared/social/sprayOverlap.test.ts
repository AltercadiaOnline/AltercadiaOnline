import { describe, expect, it } from 'vitest';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import {
  isSprayTooCloseToOthers,
  sprayOverlapRatio,
  sprayFootprintRect,
  SPRAY_MAX_OVERLAP_RATIO,
} from './sprayOverlap.js';

const TILE = DESIGN_CONFIG.TILE.SIZE;

describe('sprayOverlap', () => {
  it('mesmo tile = 100% de overlap', () => {
    const a = sprayFootprintRect(10, 10, TILE);
    const b = sprayFootprintRect(10, 10, TILE);
    expect(sprayOverlapRatio(a, b)).toBe(1);
  });

  it('tile vizinho ortogonal fica abaixo do teto de 30%', () => {
    const a = sprayFootprintRect(10, 10, TILE);
    const b = sprayFootprintRect(11, 10, TILE);
    expect(sprayOverlapRatio(a, b)).toBeLessThanOrEqual(SPRAY_MAX_OVERLAP_RATIO);
    expect(
      isSprayTooCloseToOthers({ tileX: 11, tileY: 10 }, [{ tileX: 10, tileY: 10 }], { tileSize: TILE }),
    ).toBe(false);
  });

  it('rejeita 100% em cima de outro jogador', () => {
    expect(
      isSprayTooCloseToOthers({ tileX: 4, tileY: 4 }, [{ tileX: 4, tileY: 4 }], { tileSize: TILE }),
    ).toBe(true);
  });

  it('permite substituir o próprio spray no mesmo tile', () => {
    expect(
      isSprayTooCloseToOthers(
        { tileX: 4, tileY: 4 },
        [{ tileX: 4, tileY: 4 }],
        { tileSize: TILE, ignoreSameTileAuthor: true },
      ),
    ).toBe(false);
  });
});
