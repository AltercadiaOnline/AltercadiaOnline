import { useEffect, useState } from 'react';
import { getPlayerDiaryStore } from '../../ui/diary/playerDiaryStore.js';
import type { PlayerDiarySnapshot } from '../../../shared/diary/diaryEntryTypes.js';

export function useDiaryPanelState(): PlayerDiarySnapshot {
  const [snapshot, setSnapshot] = useState(() => getPlayerDiaryStore().getSnapshot());

  useEffect(() => getPlayerDiaryStore().subscribe(setSnapshot), []);

  return snapshot;
}
