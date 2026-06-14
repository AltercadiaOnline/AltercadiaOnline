/** Raiz dos spritesheets modulares por skin — public/assets/player/{skinId}/… */
export const PLAYER_SHEET_ASSET_ROOT = '/assets/player';

/** Skin padrão do protagonista (bundle metadata atual). */
export const DEFAULT_PLAYER_SKIN_ID = 'player.teste.asset';

/** Nome do arquivo spritesheet dentro de cada pasta de skin. */
export const PLAYER_SHEET_FILENAME = 'sheet.png';

/**
 * Bundle top-down do protagonista (Stardew / 8 direções).
 * Assets: public/assets/player/player.teste.asset/
 */
export const TOP_DOWN_PLAYER_BUNDLE_ROOT = `/assets/player/${DEFAULT_PLAYER_SKIN_ID}`;

/** Prefixo das rotações no metadata export v3 (pasta do personagem). */
export const PLAYER_ROTATIONS_PATH_PREFIX = 'Pixel_art_character_sprite_front/rotations';

/** URL da rotação sul — fallback em combate / loaders legados. */
export const DEFAULT_PLAYER_SOUTH_ROTATION_URL =
  `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${PLAYER_ROTATIONS_PATH_PREFIX}/south.png`;

/** @deprecated Use TOP_DOWN_PLAYER_BUNDLE_ROOT */
export const PLAYER_ASSET_BUNDLE_ROOT = TOP_DOWN_PLAYER_BUNDLE_ROOT;

export const PLAYER_ASSET_METADATA_URL = `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/metadata.json`;

/** Compositor de camadas modulares — desligado até assets em public/assets/players/layers/ */
export const USE_LAYER_COMPOSITOR = false;

/** Resolução nativa dos frames no metadata (112×112 — player.teste.asset). */
export const PLAYER_FRAME_SIZE_DEFAULT = 112;

/** Camada corporal base (pele/corpo) — sempre desenhada primeiro. */
export const PLAYER_BASE_LAYER_ID = 'base';

/** Detalhes techwear / acessórios — desenhados por cima de tudo. */
export const PLAYER_ACCESSORIES_LAYER_ID = 'accessories';

/**
 * Ordem de composição (bottom → top).
 * Troque só shirt/pants sem recombinar 100 sprites completos.
 */
export const PLAYER_LAYER_RENDER_ORDER = [
  PLAYER_BASE_LAYER_ID,
  'pants',
  'shoes',
  'shirt',
  'hair',
  PLAYER_ACCESSORIES_LAYER_ID,
] as const;

export type PlayerLayerRenderSlot = (typeof PLAYER_LAYER_RENDER_ORDER)[number];
