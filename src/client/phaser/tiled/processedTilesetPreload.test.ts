import { describe, expect, it } from 'vitest';
import {
  processedTilesetAtlasKeyFromSourceUrl,
  ROAD2_ATLAS_TEXTURE_KEY,
  ROAD2_SOURCE_PUBLIC_URL,
} from './processedTilesetPreload.js';

describe('processedTilesetPreload', () => {
  it('deriva texture key do basename do PNG; Road2 usa road2_atlas', () => {
    expect(processedTilesetAtlasKeyFromSourceUrl(ROAD2_SOURCE_PUBLIC_URL)).toBe('road2_atlas');
    expect(ROAD2_ATLAS_TEXTURE_KEY).toBe('road2_atlas');
  });
});
