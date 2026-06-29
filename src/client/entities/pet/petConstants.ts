import type { PetKindId } from '../../../shared/pet/petCatalog.js';

export const PET_ASSET_ROOT = '/assets/pets';

export const PET_FRAME_SIZE_DEFAULT = 48;

export type PetAssetBundleConfig = {
  readonly bundleFolder: string;
  readonly metadataUrl: string;
};

/** Bundles PixelLab v3 — public/assets/pets/{bundleFolder}/metadata.json */
export const PET_ASSET_BUNDLES: Readonly<Record<PetKindId, PetAssetBundleConfig>> = {
  dimensional_cat: {
    bundleFolder: 'cat_pet_1_asset',
    metadataUrl: `${PET_ASSET_ROOT}/cat_pet_1_asset/metadata.json`,
  },
  dimensional_dog: {
    bundleFolder: 'dog_pet_1_asset',
    metadataUrl: `${PET_ASSET_ROOT}/dog_pet_1_asset/metadata.json`,
  },
};
