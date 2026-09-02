import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import type { CharacterLevelSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';

/** Nível/XP do PDS — espelho de sessão, não hub/DB. */
export function readLiveCharacterLevel(): CharacterLevelSnapshot {
  return getDataStore().getCharacterLevel();
}

export function overlayLiveLevelOnProfile(profile: PlayerProfileSnapshot): PlayerProfileSnapshot {
  const live = readLiveCharacterLevel();
  return {
    ...profile,
    level: live.level,
    xpCurrent: live.xpCurrent,
    xpToNext: live.xpToNext,
  };
}

/**
 * Slice `characterLevel` + evento global (cross-bundle).
 * Só dispara re-render — nunca setLevel / setPlayerInfo.
 */
export function subscribeLiveCharacterLevel(listener: () => void): () => void {
  const unsubStore = getDataStore().subscribe('characterLevel', () => {
    listener();
  });
  const unsubEvent = uiEvents.on(UIEventType.CHARACTER_LEVEL_UPDATED, listener);
  return () => {
    unsubStore();
    unsubEvent();
  };
}
