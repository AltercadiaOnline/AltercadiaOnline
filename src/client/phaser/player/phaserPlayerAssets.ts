import { PlayerSpriteLoader } from '../../entities/player/PlayerSpriteLoader.js';

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

/**
 * Injeta o spritesheet top-down já carregado pelo PlayerSpriteLoader no cache Phaser.
 * Reutiliza o mesmo asset do canvas legado (online-first).
 */
export async function ensurePlayerSheetTexture(
  textures: PhaserTextureManager,
): Promise<boolean> {
  if (textures.exists(PHASER_PLAYER_TEXTURE_KEY)) {
    return true;
  }

  const sheet = await PlayerSpriteLoader.loadTopDownSpriteSheet();
  if (!sheet || sheet.naturalWidth <= 0) {
    return false;
  }

  const added = textures.addImage(PHASER_PLAYER_TEXTURE_KEY, sheet);
  if (!added) {
    return false;
  }

  try {
    textures.get(PHASER_PLAYER_TEXTURE_KEY).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* filter opcional — pixelArt no GameConfig já cobre na maioria dos casos */
  }

  return true;
}

/** URLs candidatas — útil para preload via Phaser.Loader (primeira tentativa). */
export function resolvePrimaryPlayerSheetUrl(): string {
  return PlayerSpriteLoader.resolveTopDownSheetUrls()[0] ?? '/assets/player/player.teste.asset/sheet.png';
}
