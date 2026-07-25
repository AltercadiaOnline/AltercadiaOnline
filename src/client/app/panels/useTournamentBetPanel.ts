// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ARENA_TOURNAMENT_MIN_BET_VOLTS, validateArenaTournamentBet, } from '../../../shared/arena/arenaTournamentBetService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { buildTournamentBetBodyHtml, } from '../../ui/arena/renderTournamentBetView.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
import { closeHudWindow } from './panelWindowActions.js';
const DEFAULT_CONTEXT = {
    pulpitId: 'arena_pulpit_center',
    pulpitName: 'Púlpito Central',
};
export function useTournamentBetPanel(enabled) {
    const [context, setContext] = useState(DEFAULT_CONTEXT);
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [betVolts, setBetVolts] = useState(ARENA_TOURNAMENT_MIN_BET_VOLTS);
    const [awaitingMatch, setAwaitingMatch] = useState(false);
    const viewModel = useMemo(() => ({
        context,
        wallet,
        betVolts,
        awaitingMatch,
    }), [awaitingMatch, betVolts, context, wallet]);
    const bodyHtml = useMemo(() => buildTournamentBetBodyHtml(viewModel), [viewModel]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.tournamentBet) {
                setContext({ ...snapshot.tournamentBet });
                setAwaitingMatch(false);
                const nextWallet = getDataStore().getWallet();
                setWallet(nextWallet);
                setBetVolts(Math.min(ARENA_TOURNAMENT_MIN_BET_VOLTS, Math.max(ARENA_TOURNAMENT_MIN_BET_VOLTS, nextWallet.dollarVolt)));
            }
        });
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        setWallet(getDataStore().getWallet());
        const unsub = getDataStore().subscribe('wallet', setWallet);
        return () => {
            unsub();
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled]);
    const confirmBet = useCallback(() => {
        const validation = validateArenaTournamentBet({
            betVolts,
            walletVolts: wallet.dollarVolt,
        });
        if (!validation.ok) {
            alertSystem(validation.reason);
            return;
        }
        setBetVolts(validation.betVolts);
        setAwaitingMatch(true);
        alertSystem(`Aposta de ${formatVoltsShort(validation.betVolts)} registrada. Aguardando adversários no torneio.`);
    }, [betVolts, wallet.dollarVolt]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.dataset.action === 'close') {
            closeHudWindow('tournamentBet');
            return;
        }
        const presetBtn = target.closest('[data-bet-preset]');
        if (presetBtn) {
            setBetVolts(Math.max(1, Number(presetBtn.dataset.betPreset) || ARENA_TOURNAMENT_MIN_BET_VOLTS));
            return;
        }
        if (target.dataset.action === 'confirm-bet') {
            confirmBet();
        }
    }, [confirmBet]);
    const handleInput = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.matches('[data-bet-input]'))
            return;
        setBetVolts(Math.max(0, Math.floor(Number(target.value) || 0)));
    }, []);
    return { context, bodyHtml, handleClick, handleInput };
}
