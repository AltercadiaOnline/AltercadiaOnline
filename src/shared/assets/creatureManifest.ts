/** Manifesto de assets side-view por criatura (fonte em /src/assets/creatures). */
export type CreatureSpriteManifest = {
  readonly idle: string;
  readonly attack: string;
};

export type CreatureManifest = {
  readonly id: string;
  readonly displayName: string;
  readonly sprites: CreatureSpriteManifest;
};

export type CreatureAssetBundle = {
  readonly id: string;
  readonly displayName: string;
  readonly creatureId: string;
  readonly zoneId: string;
  readonly folder: string;
  readonly sprites: {
    readonly idle: string;
    readonly attack: string;
  };
};

export const CREATURE_ASSET_PUBLIC_BASE = '/assets/creatures';

export function buildCreatureSpriteUrl(
  zoneId: string,
  folder: string,
  fileName: string,
): string {
  return `${CREATURE_ASSET_PUBLIC_BASE}/${zoneId}/${folder}/${fileName}`;
}
