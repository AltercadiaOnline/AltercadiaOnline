// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { getPetMemorialStore } from '../../ui/pet/petMemorialStore.js';
import { renderMemorialBook } from '../../ui/pet/memorialBookView.js';
export function usePetMemorialPanel(enabled) {
    const [snapshot, setSnapshot] = useState(() => getPetMemorialStore().getSnapshot());
    useEffect(() => {
        if (!enabled)
            return;
        setSnapshot(getPetMemorialStore().getSnapshot());
        return getPetMemorialStore().subscribe(setSnapshot);
    }, [enabled]);
    const bodyHtml = useMemo(() => renderMemorialBook(snapshot), [snapshot]);
    return { bodyHtml };
}
