import { resolveCharacterSkin } from '../../shared/character/characterAppearance.js';
import { resolvePlayerSkinBundleId } from '../../shared/character/playerSkinBundle.js';
import type { PlayerSkin } from '../../shared/character/playerSkin.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import { eventBus, HudEvent } from '../../shared/utils/EventBus.js';
import { getCharacterSelectPreviewManager } from '../browser/characterSelectPreview.js';
import { getPlayerSkinStore } from '../ui/character/playerSkinStore.js';
import { AppScreens } from '../browser/appScreens.js';
import { setActivePlayerSkinBundleId } from '../entities/player/activePlayerSkinBundle.js';

let active = false;
const unsubscribers: Array<() => void> = [];

/**
 * Atualiza skin no hub em memória e nos previews da seleção.
 * Persistência autoritativa no servidor será feita via API dedicada.
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
  setActivePlayerSkinBundleId(resolvePlayerSkinBundleId(character));
  getPlayerSkinStore().loadSkin(resolveCharacterSkin(character));
}

function updateHubCharacterSkin(
  characterId: number,
  skin: PlayerSkin,
): { ok: true; character: AccountCharacter } | { ok: false } {
  const hub = AppScreens.characterHub;
  if (!hub) return { ok: false };

  const slotIndex = hub.slots.findIndex(
    (slot) => slot !== null && slot.id === characterId,
  );
  if (slotIndex < 0) return { ok: false };

  const current = hub.slots[slotIndex]!;
  const character: AccountCharacter = {
    ...current,
    skin: resolveCharacterSkin({ skin }),
  };

  const slots = [...hub.slots];
  slots[slotIndex] = character;
  AppScreens.characterHub = { userId: hub.userId, slots };
  return { ok: true, character };
}

function persistActiveCharacterSkin(skin: PlayerSkin): void {
  const character = AppScreens.getSelectedCharacter();
  if (!character) return;

  const result = updateHubCharacterSkin(character.id, skin);
  if (!result.ok) return;

  getCharacterSelectPreviewManager().refreshCharacterSkin(character.id, skin);
}
