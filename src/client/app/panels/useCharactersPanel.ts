// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EQUIPMENT_UI_SLOT_ORDER, EQUIPMENT_UI_SLOT_LABELS, } from '../../../shared/character/equipmentUiSlots.js';
import { calculateStatsBonusFromEquipment, } from '../../../shared/character/playerStatsBonus.js';
import { getPlayerSkinStore } from '../../ui/character/playerSkinStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getPlayerEquipmentStore, } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../../ui/items/playerItemStore.js';
import { getCarryCapacityStore } from '../../ui/capacity/carryCapacityStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { resolveExplorationSpeedBonusFromAgility, } from '../../ui/character/levelProgressionSection.js';
import { buildOperativeEventLogLines, } from '../../ui/character/characterPanelAchievementLog.js';
import { resolveEstiloName } from '../../ui/character/characterPanelEstilo.js';
import { resolveMapSyncStatus, } from '../../ui/character/characterPanelSyncStatus.js';
import { fetchWorldChronicles, resolveWorldLoreEntriesForClient, } from '../../services/worldLoreClient.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { getMinimapSnapshot, subscribeMinimapSnapshot, } from '../../world/minimap/minimapState.js';
function shouldRefreshPetBlock(before, after) {
    if (before === after)
        return false;
    if (!before || !after)
        return before !== after;
    return before.instanceId !== after.instanceId
        || before.hpCurrent !== after.hpCurrent
        || before.status !== after.status
        || before.affinityXp !== after.affinityXp;
}
function buildInitialCoreState() {
    const equipmentGrid = getPlayerItemStore().toEquipmentGrid();
    return {
        skinState: getPlayerSkinStore().getState(),
        equipmentMeta: getPlayerEquipmentStore().getSnapshot(),
        equipmentGrid,
        profile: getPlayerProfileStore().getSnapshot(),
        openSkinMenu: null,
        syncStatus: resolveMapSyncStatus(getMinimapSnapshot()?.mapId ?? null),
        eventLogLines: [],
        resolvedEstiloName: '—',
        petSnapshot: getPlayerPetStore().getSnapshot(),
        walletTick: 0,
    };
}
function buildView(state) {
    const statsBonus = calculateStatsBonusFromEquipment(state.equipmentGrid);
    const speedBonusTotal = resolveExplorationSpeedBonusFromAgility(statsBonus.agilidade);
    const isEncumbered = getCarryCapacityStore().isEncumbered();
    const wallet = getDataStore().getWallet();
    void state.walletTick;
    return {
        skinState: state.skinState,
        equipmentMeta: state.equipmentMeta,
        equipmentGrid: state.equipmentGrid,
        profile: state.profile,
        openSkinMenu: state.openSkinMenu,
        syncStatus: state.syncStatus,
        eventLogLines: state.eventLogLines,
        resolvedEstiloName: state.resolvedEstiloName,
        petSnapshot: state.petSnapshot,
        walletVoltsFormatted: wallet.voltsFormatted,
        walletAlterFormatted: wallet.alterFormatted,
        levelProgressionModel: {
            profile: state.profile,
            classId: state.equipmentMeta.classId,
            vitals: state.equipmentMeta.vitals,
            speedBonusTotal,
            isEncumbered,
        },
    };
}
export function useCharactersPanel(enabled) {
    const [core, setCore] = useState(buildInitialCoreState);
    useEffect(() => {
        if (!enabled)
            return;
        const equipment = getPlayerEquipmentStore().getSnapshot();
        getPlayerProfileStore().setLevel(equipment.level);
        const dataStore = getDataStore();
        setCore((prev) => ({
            ...prev,
            syncStatus: resolveMapSyncStatus(getMinimapSnapshot()?.mapId ?? null),
            resolvedEstiloName: resolveEstiloName(getGlobalPlayerStore().getConfirmedLoadout(), dataStore.getMarcosState()),
            petSnapshot: getPlayerPetStore().getSnapshot(),
        }));
        void (async () => {
            const creds = resolveWorldLoreCredentials();
            try {
                await fetchWorldChronicles({
                    playerId: creds.playerId,
                    characterId: creds.characterId,
                });
            }
            catch {
                // offline / mock
            }
            setCore((prev) => ({
                ...prev,
                eventLogLines: buildOperativeEventLogLines(resolveWorldLoreEntriesForClient()),
            }));
        })();
        const unsubscribers = [
            getPlayerSkinStore().subscribe((skinState) => setCore((prev) => ({ ...prev, skinState }))),
            getPlayerEquipmentStore().subscribe((equipmentMeta) => {
                getPlayerProfileStore().setLevel(equipmentMeta.level);
                setCore((prev) => ({ ...prev, equipmentMeta }));
            }),
            getPlayerItemStore().subscribe(() => {
                setCore((prev) => ({
                    ...prev,
                    equipmentGrid: getPlayerItemStore().toEquipmentGrid(),
                }));
            }),
            getPlayerProfileStore().subscribe((profile) => setCore((prev) => ({ ...prev, profile }))),
            uiEvents.on(UIEventType.PLAYER_STATS_UPDATED, () => setCore((prev) => ({ ...prev }))),
            uiEvents.on(UIEventType.CAPACITY_UPDATED, () => setCore((prev) => ({ ...prev }))),
            dataStore.subscribe('wallet', () => {
                setCore((prev) => ({ ...prev, walletTick: prev.walletTick + 1 }));
            }),
            subscribeMinimapSnapshot((snapshot) => {
                setCore((prev) => ({
                    ...prev,
                    syncStatus: resolveMapSyncStatus(snapshot.mapId),
                }));
            }),
            getGlobalPlayerStore().subscribe(() => setCore((prev) => ({ ...prev }))),
            getPlayerPetStore().subscribeRoster(() => {
                const nextPet = getPlayerPetStore().getSnapshot();
                setCore((prev) => {
                    if (!shouldRefreshPetBlock(prev.petSnapshot, nextPet)) {
                        return { ...prev, petSnapshot: nextPet };
                    }
                    return { ...prev, petSnapshot: nextPet };
                });
            }),
        ];
        return () => {
            for (const off of unsubscribers)
                off();
        };
    }, [enabled]);
    const view = useMemo(() => buildView(core), [core]);
    const toggleSkinMenu = useCallback((slot) => {
        setCore((prev) => ({
            ...prev,
            openSkinMenu: prev.openSkinMenu === slot ? null : slot,
        }));
    }, []);
    const selectSkinOption = useCallback((slot, optionId) => {
        getPlayerSkinStore().setSkinSlot(slot, optionId);
        setCore((prev) => ({ ...prev, openSkinMenu: null }));
    }, []);
    const closeSkinMenu = useCallback(() => {
        setCore((prev) => (prev.openSkinMenu ? { ...prev, openSkinMenu: null } : prev));
    }, []);
    return {
        view,
        toggleSkinMenu,
        selectSkinOption,
        closeSkinMenu,
    };
}
export function resolveEquipmentSlotRows(equipmentGrid) {
    const store = getPlayerEquipmentStore();
    return EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
        const itemId = equipmentGrid[slotId];
        return {
            slotId,
            label: EQUIPMENT_UI_SLOT_LABELS[slotId],
            name: itemId ? store.getItemDisplayName(itemId) : '—',
            filled: Boolean(itemId),
        };
    });
}
