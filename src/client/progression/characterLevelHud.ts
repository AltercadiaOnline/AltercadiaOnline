import { resolveCharacterLevelXpBar } from '../../shared/character/characterLevelProgression.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { patchSidebarLevelProgression } from '../ui/character/levelProgressionSection.js';
import { getEquipmentSidebar } from '../ui/components/EquipmentSidebar.js';

/** Atualiza barras de XP na HUD usando xpCurrent vs getRequiredXpForNextLevel(level). */
export function refreshCharacterLevelProgressHud(): void {
  const levelState = getMutableDataStore().getCharacterLevel();
  const bar = resolveCharacterLevelXpBar(levelState.level, levelState.xpCurrent);
  const profile = getPlayerProfileStore().getSnapshot();

  const sidebar = getEquipmentSidebar();
  if (sidebar) {
    sidebar.refreshLevelXpBar(profile, bar);
  }
}

export { resolveCharacterLevelXpBar };
