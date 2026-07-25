// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { getPlayerDiaryStore } from '../../ui/diary/playerDiaryStore.js';
import { renderDiaryBook } from '../../ui/diary/diaryBookView.js';
export function useDiaryPanel(enabled) {
    const [snapshot, setSnapshot] = useState(() => getPlayerDiaryStore().getSnapshot());
    useEffect(() => {
        if (!enabled)
            return;
        setSnapshot(getPlayerDiaryStore().getSnapshot());
        return getPlayerDiaryStore().subscribe(() => {
            setSnapshot(getPlayerDiaryStore().getSnapshot());
        });
    }, [enabled]);
    const bodyHtml = useMemo(() => renderDiaryBook(snapshot), [snapshot]);
    return { bodyHtml };
}
