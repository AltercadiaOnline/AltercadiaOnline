import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import type { SpriteFrame } from '../player/types.js';

export type PetAssetMetadata = {
  readonly states: readonly {
    readonly character: {
      readonly size: { readonly width: number; readonly height: number };
    };
    readonly frames: {
      readonly rotations: Readonly<Record<string, string>>;
    };
  }[];
};

export type PetSpriteCatalog = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly rotations: Readonly<Partial<Record<PlayerFacing, SpriteFrame>>>;
};
