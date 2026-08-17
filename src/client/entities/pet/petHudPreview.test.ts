import { describe, expect, it } from 'vitest';
import {
  PET_BATTLE_FACING,
  resolvePetBattleArenaSpriteCandidates,
  resolvePetHudEastPreviewUrl,
  resolvePetHudSouthPreviewUrl,
} from './petHudPreview.js';

describe('petHudPreview', () => {
  it('batalha sempre aponta para rotations/east.png (gato e cachorro)', () => {
    expect(PET_BATTLE_FACING).toBe('east');
    expect(resolvePetHudEastPreviewUrl('dimensional_cat')).toBe(
      '/assets/pets/cat_pet_1_asset/Pixel_art_sprite_top-down_view_a_small_cat_sitting/rotations/east.png',
    );
    expect(resolvePetHudEastPreviewUrl('dimensional_dog')).toMatch(/\/rotations\/east\.png$/);
    expect(resolvePetHudSouthPreviewUrl('dimensional_cat')).toMatch(/\/rotations\/south\.png$/);

    const catCandidates = resolvePetBattleArenaSpriteCandidates('dimensional_cat');
    expect(catCandidates[0]).toMatch(/\/rotations\/east\.png$/);
    expect(catCandidates.every((url) => !url.endsWith('/south.png'))).toBe(true);
  });
});
