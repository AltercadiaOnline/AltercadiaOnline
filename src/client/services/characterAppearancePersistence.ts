import { resolveCharacterSkin } from '../../shared/character/characterAppearance.js';
import type { PlayerSkin } from '../../shared/character/playerSkin.js';
import { eventBus, HudEvent } from '../../shared/utils/EventBus.js';
import { getCharacterSelectPreviewManager } from '../browser/characterSelectPreview.js';
import { getPlayerSkinStore } from '../ui/character/playerSkinStore.js';
import { updateCharacterSkin } from './localCharacterHubStore.js';
import { AppScreens } from '../browser/appScreens.js';

let active = false;
const unsubscribers: Array<() => void> = [];

/**
 * Persiste skin no hub do personagem e atualiza previews da seleção.
 * Mantém o avatar da tela de login alinhado ao top-down do mundo.
 */
export function initCharacterAppearancePersistence(): void {
  if (active) return;
  active = true;

  unsubscribers.push(
    eventBus.subscribe(HudEvent.SKIN_CHANGED, ({ skin }) => {
      persistActiveCharacterSkin(skin);
    }),
  );
}

export function destroyCharacterAppearancePersistence(): void {
  for (const off of unsubscribers) off();
  unsubscribers.length = 0;
  active = false;
}

export function loadSelectedCharacterAppearance(): void {
  const character = AppScreens.getSelectedCharacter();
  if (!character) return;
  getPlayerSkinStore().loadSkin(resolveCharacterSkin(character));
}

function persistActiveCharacterSkin(skin: PlayerSkin): void {
  const session = AppScreens.currentSession;
  const character = AppScreens.getSelectedCharacter();
  if (!session || !character) return;

  const result = updateCharacterSkin(session.id, character.id, skin);
  if (!result.ok) return;

  AppScreens.characterHub = result.hub;
  getCharacterSelectPreviewManager().refreshCharacterSkin(character.id, skin);
}
