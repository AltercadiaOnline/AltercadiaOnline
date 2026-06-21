import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EQUIPMENT_UI_SLOT_LABELS,
  EQUIPMENT_UI_SLOT_ORDER,
  type EquipmentUiGridState,
} from '../../../shared/character/equipmentUiSlots.js';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import {
  calculateStatsBonusFromEquipment,
  type PlayerStatsBonus,
} from '../../../shared/character/playerStatsBonus.js';
import {
  getSkinOptionLabel,
  SKIN_SLOT_LABELS,
  SKIN_SLOT_ORDER,
  type SkinSlotId,
} from '../../../shared/character/playerSkin.js';
import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getCarryCapacityStore } from '../../ui/capacity/carryCapacityStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getPlayerSkinStore, type PlayerSkinState } from '../../ui/character/playerSkinStore.js';
import { resolveEstiloName } from '../../ui/character/characterPanelEstilo.js';
import {
  buildOperativeEventLogLines,
  type OperativeEventLogLine,
} from '../../ui/character/characterPanelAchievementLog.js';
import {
  resolveExplorationSpeedBonusFromAgility,
  type LevelProgressionSectionModel,
} from '../../ui/character/levelProgressionSection.js';
import {
  resolveMapSyncStatus,
  type MapSyncStatus,
} from '../../ui/character/characterPanelSyncStatus.js';
import { getPlayerEquipmentStore, type PlayerEquipmentSnapshot } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import {
  fetchWorldChronicles,
  resolveWorldLoreEntriesForClient,
} from '../../services/worldLoreClient.js';
import {
  getMinimapSnapshot,
  subscribeMinimapSnapshot,
} from '../../world/minimap/minimapState.js';

const EMPTY_STATS: PlayerStatsBonus = {
  defesa: 0,
  esquiva: 0,
  vida: 0,
  agilidade: 0,
  critico: 0,
  forca: 0,
};

function syncExplorationSpeedFromGrid(equipmentGrid: EquipmentUiGridState): {
  readonly statsBonus: PlayerStatsBonus;
  readonly speedBonusTotal: number;
  readonly isEncumbered: boolean;
} {
  const statsBonus = calculateStatsBonusFromEquipment(equipmentGrid);
  return {
    statsBonus,
    speedBonusTotal: resolveExplorationSpeedBonusFromAgility(statsBonus.agilidade),
    isEncumbered: getCarryCapacityStore().isEncumbered(),
  };
}

export function useCharactersPanelState() {
  const dataStore = getDataStore();

  const [skinState, setSkinState] = useState<PlayerSkinState>(() => getPlayerSkinStore().getState());
  const [equipmentMeta, setEquipmentMeta] = useState<PlayerEquipmentSnapshot>(
    () => getPlayerEquipmentStore().getSnapshot(),
  );
  const [equipmentGrid, setEquipmentGrid] = useState<EquipmentUiGridState>(
    () => getPlayerItemStore().toEquipmentGrid(),
  );
  const [profile, setProfile] = useState<PlayerProfileSnapshot>(
    () => getPlayerProfileStore().getSnapshot(),
  );
  const [statsBonus, setStatsBonus] = useState<PlayerStatsBonus>(EMPTY_STATS);
  const [speedBonusTotal, setSpeedBonusTotal] = useState(0);
  const [isEncumbered, setIsEncumbered] = useState(() => getCarryCapacityStore().isEncumbered());
  const [openSkinMenu, setOpenSkinMenu] = useState<SkinSlotId | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot>(() => dataStore.getWallet());
  const [syncStatus, setSyncStatus] = useState<MapSyncStatus>(
    () => resolveMapSyncStatus(getMinimapSnapshot()?.mapId ?? null),
  );
  const [petSnapshot, setPetSnapshot] = useState<PetSnapshot | null>(
    () => getPlayerPetStore().getSnapshot(),
  );
  const [roster, setRoster] = useState<PlayerPetRosterSnapshot>(
    () => getPlayerPetStore().getRoster(),
  );
  const [eventLogLines, setEventLogLines] = useState<readonly OperativeEventLogLine[]>([]);
  const [estiloName, setEstiloName] = useState('—');
  const [loadoutTick, setLoadoutTick] = useState(0);

  useEffect(() => {
    const initialEquipment = getPlayerEquipmentStore().getSnapshot();
    getPlayerProfileStore().setLevel(initialEquipment.level);

    const initialGrid = getPlayerItemStore().toEquipmentGrid();
    const speed = syncExplorationSpeedFromGrid(initialGrid);
    setStatsBonus(speed.statsBonus);
    setSpeedBonusTotal(speed.speedBonusTotal);
    setIsEncumbered(speed.isEncumbered);

    setEstiloName(resolveEstiloName(
      getGlobalPlayerStore().getConfirmedLoadout(),
      dataStore.getMarcosState(),
    ));

    const unsubSkin = getPlayerSkinStore().subscribe(setSkinState);

    const unsubEquipment = getPlayerEquipmentStore().subscribe((snapshot) => {
      setEquipmentMeta(snapshot);
      getPlayerProfileStore().setLevel(snapshot.level);
    });

    const unsubPlayerItems = getPlayerItemStore().subscribe(() => {
      const grid = getPlayerItemStore().toEquipmentGrid();
      setEquipmentGrid(grid);
      const nextSpeed = syncExplorationSpeedFromGrid(grid);
      setStatsBonus(nextSpeed.statsBonus);
      setSpeedBonusTotal(nextSpeed.speedBonusTotal);
      setIsEncumbered(nextSpeed.isEncumbered);
    });

    const unsubProfile = getPlayerProfileStore().subscribe(setProfile);

    const unsubStats = uiEvents.on(UIEventType.PLAYER_STATS_UPDATED, (payload) => {
      setStatsBonus(payload.statsBonus);
      setSpeedBonusTotal(payload.speedBonusTotal);
    });

    const unsubCapacity = uiEvents.on(UIEventType.CAPACITY_UPDATED, (capacity) => {
      setIsEncumbered(capacity.isEncumbered);
    });

    const unsubWallet = dataStore.subscribe('wallet', setWallet);

    const unsubMinimap = subscribeMinimapSnapshot((snapshot) => {
      setSyncStatus(resolveMapSyncStatus(snapshot.mapId));
    });

    const unsubLoadout = getGlobalPlayerStore().subscribe(() => {
      setLoadoutTick((tick) => tick + 1);
    });

    const unsubPet = getPlayerPetStore().subscribeRoster(() => {
      setPetSnapshot(getPlayerPetStore().getSnapshot());
      setRoster(getPlayerPetStore().getRoster());
    });

    return () => {
      unsubSkin();
      unsubEquipment();
      unsubPlayerItems();
      unsubProfile();
      unsubStats();
      unsubCapacity();
      unsubWallet();
      unsubMinimap();
      unsubLoadout();
      unsubPet();
    };
  }, [dataStore]);

  useEffect(() => {
    setEstiloName(resolveEstiloName(
      getGlobalPlayerStore().getConfirmedLoadout(),
      dataStore.getMarcosState(),
    ));
  }, [dataStore, loadoutTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadEventLog(): Promise<void> {
      const creds = resolveWorldLoreCredentials();
      try {
        await fetchWorldChronicles({
          playerId: creds.playerId,
          characterId: creds.characterId,
        });
      } catch {
        // Mock local ou timeout — usa entradas disponíveis offline.
      }

      if (!cancelled) {
        setEventLogLines(buildOperativeEventLogLines(resolveWorldLoreEntriesForClient()));
      }
    }

    void loadEventLog();

    return () => {
      cancelled = true;
    };
  }, []);

  const levelProgressionModel = useMemo<LevelProgressionSectionModel>(() => ({
    profile,
    classId: equipmentMeta.classId,
    vitals: equipmentMeta.vitals,
    speedBonusTotal,
    isEncumbered,
  }), [profile, equipmentMeta, speedBonusTotal, isEncumbered]);

  const toggleSkinMenu = useCallback((slot: SkinSlotId) => {
    setOpenSkinMenu((current) => (current === slot ? null : slot));
  }, []);

  const selectSkinOption = useCallback((slot: SkinSlotId, optionId: string) => {
    getPlayerSkinStore().setSkinSlot(slot, optionId);
    setOpenSkinMenu(null);
  }, []);

  const closeSkinMenu = useCallback(() => {
    setOpenSkinMenu(null);
  }, []);

  const resolveEquipmentName = useCallback((itemId: string | null): string => {
    if (!itemId) return '—';
    return getPlayerEquipmentStore().getItemDisplayName(itemId);
  }, [equipmentGrid]);

  return {
    skinState,
    equipmentMeta,
    equipmentGrid,
    profile,
    statsBonus,
    wallet,
    syncStatus,
    petSnapshot,
    roster,
    eventLogLines,
    estiloName,
    openSkinMenu,
    levelProgressionModel,
    toggleSkinMenu,
    selectSkinOption,
    closeSkinMenu,
    resolveEquipmentName,
    skinSlotOrder: SKIN_SLOT_ORDER,
    skinSlotLabels: SKIN_SLOT_LABELS,
    getSkinOptionLabel,
    equipmentSlotOrder: EQUIPMENT_UI_SLOT_ORDER,
    equipmentSlotLabels: EQUIPMENT_UI_SLOT_LABELS,
  };
}
