import type { PlayerSkin } from '../../../shared/character/playerSkin.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import { paintCharacterBundleSouthPreview } from './characterAvatarPreview.js';

/** Desenha preview idle (south) no canvas da ficha — PNG preenche ~80% do slot. */
export function paintCharacterPanelPreview(
  canvas: HTMLCanvasElement,
  skin: PlayerSkin,
): void {
  void paintCharacterBundleSouthPreview(
    canvas,
    getActivePlayerSkinBundleId(),
    {
      skin,
      facing: 'south',
      backdropAlpha: 0.35,
      visualOccupancy: 0.8,
      showSkinAccentStrip: true,
    },
  );
}
