import { PLAYER_ASSET_METADATA_URL } from '../entities/player/playerConstants.js';
import { warnLegacyRenderCall } from '../render/legacyRenderWarnings.js';

/** @deprecated Use src/client/entities/player/ — metadata-driven loader. */
export const PLAYER_WALK_SPRITE_SRC = PLAYER_ASSET_METADATA_URL;

/** @deprecated Use PlayerSpriteLoader — sem cache, não use em runtime. */
export function loadImageSprite(src: string): HTMLImageElement {
  warnLegacyRenderCall('loadImageSprite', 'PlayerSpriteLoader');
  const image = new Image();
  image.src = src;
  return image;
}
