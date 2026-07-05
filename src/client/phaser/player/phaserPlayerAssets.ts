import { PlayerSpriteLoader } from '../../entities/player/PlayerSpriteLoader.js';
import {
  DEFAULT_PLAYER_SOUTH_ROTATION_URL,
} from '../../entities/player/playerConstants.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import {
  resolvePlayerCardinalRotationUrls,
  resolvePlayerSkinBundleSouthPreviewUrl,
} from '../../../shared/character/playerSkinBundle.js';

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

  const sheet = await PlayerSpriteLoader.loadTopDownSpriteSheet(getActivePlayerSkinBundleId());
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

  const catalog = await PlayerSpriteLoader.getTopDownCatalog(getActivePlayerSkinBundleId());
  let loadedAny = false;

  const cardinalDirections = ['south', 'east', 'north', 'west'] as const;
  for (const direction of cardinalDirections) {
    if (textures.exists(playerRotationTextureKey(direction))) {
      loadedAny = true;
    }
  }

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
  const bundleId = getActivePlayerSkinBundleId();
  return (
    PlayerSpriteLoader.resolveTopDownSheetUrls(bundleId).find((url) => url.endsWith('.png'))
    ?? resolvePlayerSkinBundleSouthPreviewUrl(bundleId)
    ?? DEFAULT_PLAYER_SOUTH_ROTATION_URL
  );
}

/** Pré-carrega rotações cardinais do bundle ativo na LoadingScene. */
export function resolvePlayerRotationPreloadEntries(): readonly { readonly key: string; readonly url: string }[] {
  const bundleId = getActivePlayerSkinBundleId();
  return resolvePlayerCardinalRotationUrls(bundleId).map(({ direction, url }) => ({
    key: playerRotationTextureKey(direction),
    url,
  }));
}
