/** Bundles top-down em public/assets/player/{id}/ — escolha na criação do personagem. */
export const PLAYER_SKIN_BUNDLE_IDS = [
  'player_male_1',
  'player_male_2',
  'player_male_3',
  'player_male_4',
  'player_female_1',
] as const;

export type PlayerSkinBundleId = (typeof PLAYER_SKIN_BUNDLE_IDS)[number];

export const DEFAULT_PLAYER_SKIN_BUNDLE_ID: PlayerSkinBundleId = 'player_male_1';

export type PlayerSkinBundleOption = {
  readonly id: PlayerSkinBundleId;
  readonly label: string;
};

export const PLAYER_SKIN_BUNDLE_OPTIONS: readonly PlayerSkinBundleOption[] = [
  { id: 'player_male_1', label: 'Masculino — Techwear' },
  { id: 'player_male_2', label: 'Masculino — Layered' },
  { id: 'player_male_3', label: 'Masculino — Street' },
  { id: 'player_male_4', label: 'Masculino — Teen' },
  { id: 'player_female_1', label: 'Feminino — Urban' },
];

/** Pasta `rotations` relativa ao bundle (nomes reais em disco, não confiar só no metadata). */
const BUNDLE_ROTATIONS_BASE: Readonly<Record<PlayerSkinBundleId, string>> = {
  player_male_1: '35x54pixel_topdown_chibi_Outfit_Oversized_techwear/rotations',
  player_male_2: 'chibi_35x54pixel_topdown_Outfit_Layered/rotations',
  player_male_3: 'Pixel_art_character_sprite_front/rotations',
  player_male_4: '2D_game_sprite_asset_teenage/rotations',
  player_female_1: '35x54_pixel_art_game_character/rotations',
};

const PLAYER_ASSET_PUBLIC_BASE = '/assets/player';

export function isValidPlayerSkinBundleId(value: string): value is PlayerSkinBundleId {
  return (PLAYER_SKIN_BUNDLE_IDS as readonly string[]).includes(value);
}

export function resolvePlayerSkinBundleId(
  source: { readonly skinBundleId?: string | null },
): PlayerSkinBundleId {
  const trimmed = source.skinBundleId?.trim();
  if (trimmed && isValidPlayerSkinBundleId(trimmed)) {
    return trimmed;
  }
  return DEFAULT_PLAYER_SKIN_BUNDLE_ID;
}

export function resolvePlayerSkinBundleSouthPreviewUrl(
  bundleId: PlayerSkinBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID,
): string {
  return resolvePlayerSkinBundleRotationUrl(bundleId, 'south');
}

export type PlayerCardinalDirection = 'south' | 'east' | 'north' | 'west';

export function resolvePlayerSkinBundleRotationUrl(
  bundleId: PlayerSkinBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  direction: PlayerCardinalDirection,
): string {
  return `${PLAYER_ASSET_PUBLIC_BASE}/${bundleId}/${BUNDLE_ROTATIONS_BASE[bundleId]}/${direction}.png`;
}

export function resolvePlayerCardinalRotationUrls(
  bundleId: PlayerSkinBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID,
): readonly { readonly direction: PlayerCardinalDirection; readonly url: string }[] {
  const cardinals: readonly PlayerCardinalDirection[] = ['south', 'east', 'north', 'west'];
  return cardinals.map((direction) => ({
    direction,
    url: resolvePlayerSkinBundleRotationUrl(bundleId, direction),
  }));
}
