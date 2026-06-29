/** Raiz dos spritesheets modulares por skin — public/assets/player/{skinId}/… */
export const PLAYER_SHEET_ASSET_ROOT = '/assets/player';

/** Skins top-down disponíveis em public/assets/player/. */
export const PLAYER_SKIN_BUNDLE_IDS = [
  'player_male_1',
  'player_male_2',
  'player_male_3',
  'player_male_4',
  'player_female_1',
] as const;

export type PlayerSkinBundleId = (typeof PLAYER_SKIN_BUNDLE_IDS)[number];

/** Skin padrão do protagonista (bundle metadata atual). */
export const DEFAULT_PLAYER_SKIN_ID: PlayerSkinBundleId = 'player_male_1';

/** Nome do arquivo spritesheet dentro de cada pasta de skin (legado — opcional). */
export const PLAYER_SHEET_FILENAME = 'sheet.png';

/** Bundle top-down ativo — public/assets/player/{skinId}/metadata.json */
export const TOP_DOWN_PLAYER_BUNDLE_ROOT = `${PLAYER_SHEET_ASSET_ROOT}/${DEFAULT_PLAYER_SKIN_ID}`;

/** URL da rotação sul — fallback em combate / loaders legados. */
export const DEFAULT_PLAYER_SOUTH_ROTATION_URL =
  `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/35x54pixel_topdown_chibi_Outfit_Oversized_techwear/rotations/south.png`;

/** @deprecated Use TOP_DOWN_PLAYER_BUNDLE_ROOT */
export const PLAYER_ASSET_BUNDLE_ROOT = TOP_DOWN_PLAYER_BUNDLE_ROOT;

export function resolvePlayerMetadataUrl(skinId: string = DEFAULT_PLAYER_SKIN_ID): string {
  return `${PLAYER_SHEET_ASSET_ROOT}/${skinId}/metadata.json`;
}

export function resolvePlayerBundleRoot(skinId: string = DEFAULT_PLAYER_SKIN_ID): string {
  return `${PLAYER_SHEET_ASSET_ROOT}/${skinId}`;
}

export const PLAYER_ASSET_METADATA_URL = resolvePlayerMetadataUrl(DEFAULT_PLAYER_SKIN_ID);

/** Compositor de camadas modulares — desligado até assets em public/assets/players/layers/ */
export const USE_LAYER_COMPOSITOR = false;

/** Resolução nativa dos frames no metadata (varia por export — fallback 104). */
export const PLAYER_FRAME_SIZE_DEFAULT = 104;

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
