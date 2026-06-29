import { PlayerSpriteLoader } from '../../entities/player/PlayerSpriteLoader.js';
import {
  DEFAULT_PLAYER_SOUTH_ROTATION_URL,
  DEFAULT_PLAYER_SKIN_ID,
} from '../../entities/player/playerConstants.js';

export const PHASER_PLAYER_TEXTURE_KEY = 'altercadia-player-sheet';

type PhaserTextureManager = {
  exists: (key: string) => boolean;
  addImage: (
    key: string,
    source: HTMLImageElement,
  ) => unknown;
  get: (key: string) => {
    setFilter: (mode: number) => void;
  };
};

/** FilterMode.NEAREST — espelha pixelArt:true no GameConfig. */
export const PHASER_TEXTURE_FILTER_NEAREST = 1;

function playerRotationTextureKey(direction: string): string {
  return `${PHASER_PLAYER_TEXTURE_KEY}:rot:${direction}`;
}

/**
 * Injeta texturas do jogador no cache Phaser — spritesheet legado ou rotações do metadata.
 */
export async function ensurePlayerSheetTexture(
  textures: PhaserTextureManager,
): Promise<boolean> {
  if (textures.exists(PHASER_PLAYER_TEXTURE_KEY)) {
    return true;
  }

  const sheet = await PlayerSpriteLoader.loadTopDownSpriteSheet();
  if (sheet && sheet.naturalWidth > 0) {
    const added = textures.addImage(PHASER_PLAYER_TEXTURE_KEY, sheet);
    if (!added) return false;
    try {
      textures.get(PHASER_PLAYER_TEXTURE_KEY).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
    } catch {
      /* noop */
    }
    return true;
  }

  const catalog = await PlayerSpriteLoader.getTopDownCatalog();
  let loadedAny = false;

  for (const [direction, frame] of Object.entries(catalog.rotations)) {
    if (!frame?.image || frame.image.naturalWidth <= 0) continue;
    const key = playerRotationTextureKey(direction);
    if (textures.exists(key)) {
      loadedAny = true;
      continue;
    }
    const added = textures.addImage(key, frame.image);
    if (added) {
      loadedAny = true;
      try {
        textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
      } catch {
        /* noop */
      }
    }
  }

  return loadedAny;
}

export function resolvePlayerPhaserTextureKey(direction: string): string {
  const rotationKey = playerRotationTextureKey(direction);
  return rotationKey;
}

export function isPlayerRotationTextureKey(key: string): boolean {
  return key.startsWith(`${PHASER_PLAYER_TEXTURE_KEY}:rot:`);
}

/** URLs candidatas — útil para preload via Phaser.Loader. */
export function resolvePrimaryPlayerSheetUrl(): string {
  return (
    PlayerSpriteLoader.resolveTopDownSheetUrls(DEFAULT_PLAYER_SKIN_ID).find((url) => url.endsWith('.png'))
    ?? DEFAULT_PLAYER_SOUTH_ROTATION_URL
  );
}
