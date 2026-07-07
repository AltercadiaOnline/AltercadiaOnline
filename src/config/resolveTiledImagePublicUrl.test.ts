import { describe, expect, it } from 'vitest';
import { resolveTiledImagePublicUrl } from './resolveTiledImagePublicUrl.js';

describe('resolveTiledImagePublicUrl', () => {
  it('resolve caminho relativo do export map_mund', () => {
    const url = resolveTiledImagePublicUrl(
      '/assets/map_mund/city_01_test.tmj',
      '../terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road2.png',
    );

    expect(url).toBe(
      '/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road2.png',
    );
  });

  it('mantém URL já absoluta em /assets/', () => {
    expect(
      resolveTiledImagePublicUrl(
        '/assets/map_mund/foo.tmj',
        '/assets/props/tree.png',
      ),
    ).toBe('/assets/props/tree.png');
  });
});
