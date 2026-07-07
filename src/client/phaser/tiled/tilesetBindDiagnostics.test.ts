import { describe, expect, it } from 'vitest';
import { computeTilesetFrameCapacity } from './tilesetBindDiagnostics.js';

describe('computeTilesetFrameCapacity', () => {
  it('marca grid alinhado para textura 256×416 com tile 32×32', () => {
    const capacity = computeTilesetFrameCapacity(32, 32, 0, 0, 256, 416, 7);

    expect(capacity.widthGridAligned).toBe(true);
    expect(capacity.heightGridAligned).toBe(true);
    expect(capacity.columns).toBe(7);
  });

  it('marca grid desalinhado para CraftPix 240×416', () => {
    const capacity = computeTilesetFrameCapacity(32, 32, 0, 0, 240, 416, 7);

    expect(capacity.widthGridAligned).toBe(false);
    expect(capacity.heightGridAligned).toBe(true);
  });
});
