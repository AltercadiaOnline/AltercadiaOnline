// @ts-nocheck
import { useEffect, useSyncExternalStore } from 'react';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import {
  getCarryCapacityStore,
  type CarryCapacitySnapshot,
} from '../../ui/capacity/carryCapacityStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import {
  getPlayerEquipmentStore,
  type PlayerEquipmentSnapshot,
} from '../../ui/equipment/playerEquipmentStore.js';
import { refreshHudPlayerHpMax } from '../../ui/equipment/playerHudHpMax.js';
import { getPlayerItemStore } from '../../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import type { GameStoreGold } from '../../state/GameStore.js';
import { usePlayerGold } from '../store/gameStore.js';
import { subscribeExternalStore } from './subscribeExternalStore.js';

/**
 * Snapshot estável por conteúdo — stores que retornam objeto novo a cada
 * getSnapshot() quebram useSyncExternalStore (React #185).
 */
function useStoreRevision(
  subscribe: (listener: () => void) => () => void,
  getRevision: () => string | number,
  serverRevision: string | number = '',
): string | number {
  return useSyncExternalStore(
    (onChange) => subscribeExternalStore(subscribe, onChange),
    getRevision,
    () => serverRevision,
  );
}

export function usePlayerEquipmentSnapshot(): PlayerEquipmentSnapshot {
  useStoreRevision(
    (listener) => getPlayerEquipmentStore().subscribe(() => listener()),
    () => {
      const s = getPlayerEquipmentStore().getSnapshot();
      return [
        s.displayName,
        s.level,
        s.classId,
        s.vitals.hpCurrent,
        s.vitals.hpMax,
        JSON.stringify(s.equipment),
      ].join('|');
    },
  );
  return getPlayerEquipmentStore().getSnapshot();
}

/**
 * Espelho único de vitals de exploração — mesma fonte da sidebar SET
 * (`playerEquipmentStore` + `refreshHudPlayerHpMax`).
 */
export function useAuthoritativeWorldVitalsStrip(): {
  readonly displayName: string;
  readonly level: number;
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly gold: GameStoreGold;
} {
  useEffect(() => {
    refreshHudPlayerHpMax();
  }, []);

  const equipment = usePlayerEquipmentSnapshot();
  const gold = usePlayerGold();

  return {
    displayName: equipment.displayName,
    level: equipment.level,
    hpCurrent: equipment.vitals.hpCurrent,
    hpMax: equipment.vitals.hpMax,
    gold,
  };
}

export function usePlayerProfileSnapshot(): PlayerProfileSnapshot {
  useStoreRevision(
    (listener) => getPlayerProfileStore().subscribe(() => listener()),
    () => JSON.stringify(getPlayerProfileStore().getSnapshot()),
  );
  return getPlayerProfileStore().getSnapshot();
}

export function useCarryCapacitySnapshot(): CarryCapacitySnapshot {
  useStoreRevision(
    (listener) => getCarryCapacityStore().subscribe(() => listener()),
    () => {
      const s = getCarryCapacityStore().getSnapshot();
      return `${s.currentWeight}|${s.maxWeight}|${s.isEncumbered}`;
    },
  );
  return getCarryCapacityStore().getSnapshot();
}

/** Re-render quando loadout confirmado muda (PP na sidebar). */
export function useConfirmedLoadoutKey(): string {
  return useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => getGlobalPlayerStore().subscribe(() => listener()),
        onChange,
      ),
    () => getGlobalPlayerStore().getConfirmedLoadout().join('\0'),
    () => '',
  );
}

/** Re-render grade SET quando inventário muda. */
export function useEquipmentGridRevision(): number {
  return useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => getPlayerItemStore().subscribe(() => listener()),
        onChange,
      ),
    () => getPlayerItemStore().getSnapshot().revision,
    () => 0,
  );
}
