import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';

/**
 * Convenção de sprites de pet (todos os kindIds futuros):
 * `public/assets/pets/{bundle}/.../rotations/{facing}.png`
 *
 * - Mundo: facing do movimento
 * - Batalha / HUD de combate: sempre EAST (olhando à direita)
 * - Loja / ficha: SOUTH (vista de cima)
 */
export const PET_BATTLE_FACING: PlayerFacing = 'east';
export const PET_HUD_PREVIEW_FACING: PlayerFacing = 'south';

const PET_ROTATION_FILE = /\/(?:north|south|east|west)\.png$/i;

/**
 * Preview south estático para HUD (loja / ficha).
 * Evita canvas async — o PNG aparece imediatamente.
 */
export const PET_HUD_SOUTH_PREVIEW_URL: Readonly<Record<PetKindId, string>> = {
  dimensional_cat:
    '/assets/pets/cat_pet_1_asset/Pixel_art_sprite_top-down_view_a_small_cat_sitting/rotations/south.png',
  dimensional_dog:
    '/assets/pets/dog_pet_1_asset/Top-down_2d_game_character_sprite_medium-sized_rea/rotations/south.png',
};

function replaceRotationFacing(url: string, facing: PlayerFacing): string {
  return url.replace(PET_ROTATION_FILE, `/${facing}.png`);
}

export function resolvePetHudSouthPreviewUrl(kindId: PetKindId): string {
  return PET_HUD_SOUTH_PREVIEW_URL[kindId];
}

export function resolvePetHudFacingPreviewUrl(kindId: PetKindId, facing: PlayerFacing): string {
  return replaceRotationFacing(PET_HUD_SOUTH_PREVIEW_URL[kindId], facing);
}

export function resolvePetHudEastPreviewUrl(kindId: PetKindId): string {
  return resolvePetHudFacingPreviewUrl(kindId, PET_BATTLE_FACING);
}

/** Side-view da arena — PNG east (pet olhando para a direita). */
export function resolvePetBattleArenaSpriteCandidates(kindId: PetKindId): readonly string[] {
  const east = resolvePetHudEastPreviewUrl(kindId);
  const encoded = encodeURI(east);
  const titled = east.replace(/east\.png$/i, 'EAST.png');
  const candidates = [east, encoded, titled];
  return [...new Set(candidates)];
}
