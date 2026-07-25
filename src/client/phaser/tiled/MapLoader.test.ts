// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { assertTilemapReadyForRender } from './MapLoader.js';
describe('assertTilemapReadyForRender', () => {
    it('throws when the tilemap cache entry is not ready yet', () => {
        const scene = {
            cache: {
                tilemap: {
                    has: () => false,
                    exists: () => false,
                },
            },
        };
        expect(() => assertTilemapReadyForRender(scene, 'missing-map', 'bindTilesets')).toThrowError(/tilemap.*not ready/i);
    });
});
