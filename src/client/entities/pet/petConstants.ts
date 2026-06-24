import type { PetKindId } from '../../../shared/pet/petCatalog.js';

export const PET_ASSET_ROOT = '/assets/pets';

export const PET_FRAME_SIZE_DEFAULT = 48;

export type PetAssetBundleConfig = {
  readonly bundleFolder: string;
  readonly metadataUrl: string;
};

/** Bundles temporários PixelLab v3 — cat e dog dimensionais. */
export const PET_ASSET_BUNDLES: Readonly<Record<PetKindId, PetAssetBundleConfig>> = {
  dimensional_cat: {
    bundleFolder: 'Pixel_art_sprite_top-down_view_a_small_cat_sitting',
    metadataUrl:
      `${PET_ASSET_ROOT}/Pixel_art_sprite_top-down_view_a_small_cat_sitting/metadata.json`,
  },
  dimensional_dog: {
    bundleFolder: 'Pixel_art_sprite_top-down_view_a_medium-sized_cara',
    metadataUrl:
      `${PET_ASSET_ROOT}/Pixel_art_sprite_top-down_view_a_medium-sized_cara/metadata.json`,
  },
};
