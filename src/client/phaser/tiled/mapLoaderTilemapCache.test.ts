// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { resolveGidTextureFrame } from './mapLoaderTilemapCache.js';
describe('resolveGidTextureFrame', () => {
    it('usa cropRect em atlas de grade sem frames nomeados', () => {
        const cachedTilesets = [
            {
                firstgid: 1,
                name: 'terrain_pack_test',
                tilewidth: 32,
                tileheight: 32,
                margin: 0,
                spacing: 0,
                columns: 32,
                tilecount: 2048,
                imagewidth: 1024,
                imageheight: 2048,
            },
        ];
        const textures = {
            exists: (key) => key === 'terrain-atlas',
            get: () => ({
                has: () => false,
                frameTotal: 1,
            }),
        };
        const resolution = resolveGidTextureFrame(textures, 366, cachedTilesets, (name) => (name === 'terrain_pack_test' ? 'terrain-atlas' : null), 'missing-gid', () => undefined);
        expect(resolution?.usedErrorTile).toBe(false);
        expect(resolution?.cropRect).toEqual({
            x: 416,
            y: 352,
            width: 32,
            height: 32,
        });
    });
});
