import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateStatsBonusFromEquipment,
  type PlayerStatsBonus,
} from '../../../shared/character/playerStatsBonus.js';
import type { EquipmentUiGridState } from '../../../shared/character/equipmentUiSlots.js';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import {
  getSkinOptionLabel,
  SKIN_SLOT_LABELS,
  SKIN_SLOT_ORDER,
  type SkinSlotId,
} from '../../../shared/character/playerSkin.js';
import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../shared/combat/moveTypes.js';
import { listAchievementDefinitions } from '../../../shared/achievements/achievementCatalog.js';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementProgressSnapshot,
} from '../../../shared/achievements/achievementTypes.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { getCarryCapacityStore } from '../../ui/capacity/carryCapacityStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getPlayerSkinStore, type PlayerSkinState } from '../../ui/character/playerSkinStore.js';
import { resolveEstiloName } from '../../ui/character/characterPanelEstilo.js';
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
import { getPlayerAchievementStore } from '../../ui/achievements/playerAchievementStore.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
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

export type CharacterAchievementRow = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly categoryLabel: string;
  readonly unlocked: boolean;
  readonly unlockedAt: number | null;
  readonly progressLabel: string | null;
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

function buildAchievementRows(
  progress: AchievementProgressSnapshot,
): readonly CharacterAchievementRow[] {
  return listAchievementDefinitions().map((def) => {
    const unlock = progress.unlocked.find((row) => row.achievementId === def.id);
    let progressLabel: string | null = null;
    if (!unlock && def.targetCount && def.id === 'pve_victories_5') {
      const current = progress.counters.pve_victories ?? 0;
      progressLabel = `${Math.min(current, def.targetCount)}/${def.targetCount}`;
    }
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      categoryLabel: ACHIEVEMENT_CATEGORY_LABELS[def.category],
      unlocked: Boolean(unlock),
      unlockedAt: unlock?.unlockedAt ?? null,
      progressLabel,
    };
  });
}

export function useCharactersPanelState() {
  const dataStore = getDataStore();

  const [skinState, setSkinState] = useState<PlayerSkinState>(() => getPlayerSkinStore().getState());
  const [equipmentMeta, setEquipmentMeta] = useState<PlayerEquipmentSnapshot>(
    () => getPlayerEquipmentStore().getSnapshot(),
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
  const [estiloName, setEstiloName] = useState('—');
  const [loadoutTick, setLoadoutTick] = useState(0);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgressSnapshot>(
    () => getPlayerAchievementStore().getSnapshot(),
  );

  useEffect(() => {
    const initialGrid = getPlayerItemStore().toEquipmentGrid();
    const speed = syncExplorationSpeedFromGrid(initialGrid);
    setStatsBonus(speed.statsBonus);
    setSpeedBonusTotal(speed.speedBonusTotal);
    setIsEncumbered(speed.isEncumbered);

    setEstiloName((() => {
      try {
        return resolveEstiloName(
          getGlobalPlayerStore().getConfirmedLoadout(),
          dataStore.getMarcosState(),
        );
      } catch {
        return '—';
      }
    })());

    const unsubSkin = getPlayerSkinStore().subscribe(setSkinState);

    // Nível vem do PlayerDataStore via profile.getSnapshot() — NÃO chamar setLevel aqui
    // (equipment.subscribe ↔ syncLevelDerivedVitals gerava stack overflow).
    const unsubEquipment = getPlayerEquipmentStore().subscribe((snapshot) => {
      setEquipmentMeta(snapshot);
    });

    const unsubPlayerItems = getPlayerItemStore().subscribe(() => {
      const grid = getPlayerItemStore().toEquipmentGrid();
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

    const unsubAchievements = getPlayerAchievementStore().subscribe(setAchievementProgress);

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
      unsubAchievements();
    };
  }, [dataStore]);

  useEffect(() => {
    try {
      setEstiloName(resolveEstiloName(
        getGlobalPlayerStore().getConfirmedLoadout(),
        dataStore.getMarcosState(),
      ));
    } catch {
      setEstiloName('—');
    }
  }, [dataStore, loadoutTick]);

  const confirmedLoadout = useMemo(() => {
    void loadoutTick;
    const loadout = getGlobalPlayerStore().getConfirmedLoadout();
    return Array.from({ length: ACTIVE_MOVESET_SLOT_COUNT }, (_, index) => loadout[index] ?? null);
  }, [loadoutTick]);

  const achievementRows = useMemo(
    () => buildAchievementRows(achievementProgress),
    [achievementProgress],
  );

  const unlockedCount = useMemo(
    () => achievementRows.filter((row) => row.unlocked).length,
    [achievementRows],
  );

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

  return {
    skinState,
    equipmentMeta,
    profile,
    statsBonus,
    wallet,
    syncStatus,
    petSnapshot,
    roster,
    estiloName,
    confirmedLoadout,
    achievementRows,
    unlockedCount,
    achievementTotal: achievementRows.length,
    openSkinMenu,
    levelProgressionModel,
    toggleSkinMenu,
    selectSkinOption,
    closeSkinMenu,
    skinSlotOrder: SKIN_SLOT_ORDER,
    skinSlotLabels: SKIN_SLOT_LABELS,
    getSkinOptionLabel,
  };
}
