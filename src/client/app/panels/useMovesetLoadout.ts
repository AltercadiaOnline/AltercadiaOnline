// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../shared/combat/moveTypes.js';
import { resolveMoveDefinitionForUi } from '../../../shared/combat/movesetLoadout.js';
import { formatCombatClassLabel } from '../../../shared/character/combatClassDisplay.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore, } from '../../ui/moveset/globalPlayerStore.js';
import { closeHudWindow } from './panelWindowActions.js';
const LOADOUT_CONFIRM_SUCCESS_MS = 1500;
function buildView(snapshot, classId, movesProgression, characterLevel, confirmFeedbackActive, confirmInFlight) {
    return {
        snapshot,
        classId,
        classLabel: formatCombatClassLabel(classId),
        movesProgression,
        characterLevel,
        confirmFeedbackActive,
        confirmInFlight,
    };
}
export function useMovesetLoadout(enabled) {
    const [snapshot, setSnapshot] = useState(() => getGlobalPlayerStore().getSnapshot());
    const [classId, setClassId] = useState(() => getPlayerEquipmentStore().getSnapshot().classId);
    const [movesProgression, setMovesProgression] = useState(() => getDataStore().getMovesProgression());
    const [characterLevel, setCharacterLevel] = useState(() => getDataStore().getCharacterLevel().level);
    const [confirmFeedbackActive, setConfirmFeedbackActive] = useState(false);
    const [confirmInFlight, setConfirmInFlight] = useState(false);
    const confirmTimerRef = useRef(null);
    const clearConfirmFeedback = useCallback(() => {
        if (confirmTimerRef.current) {
            clearTimeout(confirmTimerRef.current);
            confirmTimerRef.current = null;
        }
        setConfirmFeedbackActive(false);
        setConfirmInFlight(false);
    }, []);
    const refreshIfIdle = useCallback(() => {
        setSnapshot(getGlobalPlayerStore().getSnapshot());
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        clearConfirmFeedback();
        getGlobalPlayerStore().beginLoadoutEdit();
        setSnapshot(getGlobalPlayerStore().getSnapshot());
        setClassId(getPlayerEquipmentStore().getSnapshot().classId);
        setMovesProgression(getDataStore().getMovesProgression());
        setCharacterLevel(getDataStore().getCharacterLevel().level);
        const dataStore = getDataStore();
        const unsubscribers = [
            getGlobalPlayerStore().subscribe((next) => {
                setSnapshot(next);
            }),
            getPlayerEquipmentStore().subscribe((next) => {
                setClassId(next.classId);
            }),
            dataStore.subscribe('movesProgression', setMovesProgression),
            dataStore.subscribe('characterLevel', (next) => setCharacterLevel(next.level)),
        ];
        return () => {
            for (const off of unsubscribers)
                off();
            clearConfirmFeedback();
        };
    }, [clearConfirmFeedback, enabled]);
    const togglePoolMove = useCallback((moveId) => {
        if (confirmFeedbackActive || confirmInFlight)
            return;
        getGlobalPlayerStore().toggleActiveMove(moveId);
    }, [confirmFeedbackActive, confirmInFlight]);
    const removeActiveMove = useCallback((moveId) => {
        if (confirmFeedbackActive || confirmInFlight)
            return;
        getGlobalPlayerStore().removeActiveMove(moveId);
    }, [confirmFeedbackActive, confirmInFlight]);
    const confirmLoadout = useCallback(async () => {
        if (confirmFeedbackActive || confirmInFlight)
            return;
        if (snapshot.activeMovesets.length !== ACTIVE_MOVESET_SLOT_COUNT)
            return;
        setConfirmInFlight(true);
        const confirmed = await getGlobalPlayerStore().confirmLoadout();
        setConfirmInFlight(false);
        if (!confirmed) {
            refreshIfIdle();
            return;
        }
        setConfirmFeedbackActive(true);
        confirmTimerRef.current = setTimeout(() => {
            clearConfirmFeedback();
            closeHudWindow('moveset');
        }, LOADOUT_CONFIRM_SUCCESS_MS);
    }, [clearConfirmFeedback, confirmFeedbackActive, confirmInFlight, refreshIfIdle, snapshot.activeMovesets.length]);
    return {
        view: buildView(snapshot, classId, movesProgression, characterLevel, confirmFeedbackActive, confirmInFlight),
        togglePoolMove,
        removeActiveMove,
        confirmLoadout,
    };
}
export function resolveMoveLabel(moveId) {
    const move = resolveMoveDefinitionForUi(moveId);
    const label = move?.name ?? moveId;
    return { label, abbrev: label.slice(0, 2).toUpperCase() };
}
