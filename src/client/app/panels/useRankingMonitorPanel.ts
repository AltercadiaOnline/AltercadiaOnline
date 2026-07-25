// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TournamentRankingPeriod, } from '../../../shared/arena/tournamentRankingTypes.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { buildRankingMonitorBodyHtml, } from '../../ui/arena/renderRankingMonitorView.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
import { closeHudWindow } from './panelWindowActions.js';
const DEFAULT_CONTEXT = {
    objectId: 'arena_ranking_monitor',
    label: 'Monitor de Ranking',
};
export function useRankingMonitorPanel(enabled) {
    const [context, setContext] = useState(DEFAULT_CONTEXT);
    const [period, setPeriod] = useState(TournamentRankingPeriod.DAILY);
    const [displayName, setDisplayName] = useState(() => getPlayerProfileStore().getSnapshot().displayName);
    const viewModel = useMemo(() => ({
        context,
        period,
        displayName,
    }), [context, displayName, period]);
    const bodyHtml = useMemo(() => buildRankingMonitorBodyHtml(viewModel), [viewModel]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.rankingMonitor) {
                setContext({ ...snapshot.rankingMonitor });
                setPeriod(TournamentRankingPeriod.DAILY);
                setDisplayName(getPlayerProfileStore().getSnapshot().displayName);
            }
        });
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        setDisplayName(getPlayerProfileStore().getSnapshot().displayName);
        const unsub = getPlayerProfileStore().subscribe((profile) => setDisplayName(profile.displayName));
        return () => {
            unsub();
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.dataset.action === 'close') {
            closeHudWindow('rankingMonitor');
            return;
        }
        const tabBtn = target.closest('[data-ranking-tab]');
        if (!tabBtn?.dataset.rankingTab)
            return;
        const nextPeriod = tabBtn.dataset.rankingTab;
        if (nextPeriod !== period) {
            setPeriod(nextPeriod);
        }
    }, [period]);
    return { context, bodyHtml, handleClick };
}
