import type { AccountCharacter } from '../types/account.js';
import {
  createDefaultPlayerSkin,
  isValidSkinSelection,
  type PlayerSkin,
} from './playerSkin.js';
import {
  resolvePlayerSkinBundleId,
  type PlayerSkinBundleId,
} from './playerSkinBundle.js';

export { isPlayerSkinRecord } from './playerSkin.js';

/** Snapshot de aparência — espelha o avatar top-down no mundo. */
export type CharacterAppearance = {
  readonly skin: PlayerSkin;
};

export function resolveCharacterSkin(character: { readonly skin?: PlayerSkin }): PlayerSkin {
  const skin = character.skin;
  if (skin && isValidSkinSelection(skin)) {
    return { ...skin };
  }
  return createDefaultPlayerSkin();
}

export function resolveCharacterAppearance(
  character: { readonly skin?: PlayerSkin },
): CharacterAppearance {
  return { skin: resolveCharacterSkin(character) };
}

export function skinAppearanceKey(skin: PlayerSkin): string {
  return `${skin.hair}|${skin.shirt}|${skin.pants}|${skin.shoes}`;
}

type AccountCharacterLike = Omit<AccountCharacter, 'skin' | 'skinBundleId'> & {
  readonly skin?: PlayerSkin;
  readonly skinBundleId?: PlayerSkinBundleId;
};

/** Garante skin válida em personagens antigos (localStorage sem campo skin). */
export function normalizeAccountCharacter(character: AccountCharacterLike): AccountCharacter {
  const skin = resolveCharacterSkin(character);
  const skinBundleId = resolvePlayerSkinBundleId(character);
  if (
    character.skin
    && skinAppearanceKey(character.skin) === skinAppearanceKey(skin)
    && resolvePlayerSkinBundleId(character) === skinBundleId
  ) {
    return { ...character, skin, skinBundleId };
  }
  return { ...character, skin, skinBundleId };
}
