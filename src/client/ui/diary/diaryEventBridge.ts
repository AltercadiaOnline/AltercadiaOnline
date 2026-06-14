import {
  buildBossDefeatDiaryEntry,
  buildMilestoneDiaryEntry,
  buildPetDeathDiaryEntry,
} from '../../../shared/diary/diaryEntryBuilders.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { getPlayerDiaryStore } from './playerDiaryStore.js';

/** Registra entradas do diário a partir de eventos do jogo. */
export function initDiaryEventBridge(): () => void {
  const offs = [
    uiEvents.on(UIEventType.PET_MEMORIAL_CREATED, (payload) => {
      getPlayerDiaryStore().append(buildPetDeathDiaryEntry(payload.memorial));
    }),
    uiEvents.on(UIEventType.BATTLE_FINISHED, (payload) => {
      const entry = buildBossDefeatDiaryEntry(payload);
      if (entry) getPlayerDiaryStore().append(entry);
    }),
    uiEvents.on(UIEventType.MARCO_CHOSEN, (payload) => {
      const entry = buildMilestoneDiaryEntry(payload.nodeId);
      if (entry) getPlayerDiaryStore().append(entry);
    }),
  ];

  return () => {
    for (const off of offs) off();
  };
}
