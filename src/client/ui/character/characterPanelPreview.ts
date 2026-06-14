import type { PlayerSkin } from '../../../shared/character/playerSkin.js';
import { getSharedPlayerSprite } from '../../entities/player/index.js';
import { paintCharacterAvatarPreview } from './characterAvatarPreview.js';

/** Desenha preview idle (south) no canvas da ficha de personagem. */
export function paintCharacterPanelPreview(
  canvas: HTMLCanvasElement,
  skin: PlayerSkin,
): void {
  void paintCharacterAvatarPreview(
    canvas,
    {
      skin,
      facing: 'south',
      backdropAlpha: 0.35,
      visualOccupancy: 0.58,
      showSkinAccentStrip: true,
    },
    getSharedPlayerSprite(),
  );
}
