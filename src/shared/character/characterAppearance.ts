import type { AccountCharacter } from '../types/account.js';
import {
  createDefaultPlayerSkin,
  isValidSkinSelection,
  type PlayerSkin,
} from './playerSkin.js';

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

type AccountCharacterLike = Omit<AccountCharacter, 'skin'> & { readonly skin?: PlayerSkin };

/** Garante skin válida em personagens antigos (localStorage sem campo skin). */
export function normalizeAccountCharacter(character: AccountCharacterLike): AccountCharacter {
  const skin = resolveCharacterSkin(character);
  if (character.skin && skinAppearanceKey(character.skin) === skinAppearanceKey(skin)) {
    return { ...character, skin };
  }
  return { ...character, skin };
}
