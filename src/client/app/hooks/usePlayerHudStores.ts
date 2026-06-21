import { useSyncExternalStore } from 'react';
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
import { getPlayerItemStore } from '../../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';

export function usePlayerEquipmentSnapshot(): PlayerEquipmentSnapshot {
  return useSyncExternalStore(
    (onChange) => getPlayerEquipmentStore().subscribe(() => onChange()),
    () => getPlayerEquipmentStore().getSnapshot(),
    () => getPlayerEquipmentStore().getSnapshot(),
  );
}

export function usePlayerProfileSnapshot(): PlayerProfileSnapshot {
  return useSyncExternalStore(
    (onChange) => getPlayerProfileStore().subscribe(() => onChange()),
    () => getPlayerProfileStore().getSnapshot(),
    () => getPlayerProfileStore().getSnapshot(),
  );
}

export function useCarryCapacitySnapshot(): CarryCapacitySnapshot {
  return useSyncExternalStore(
    (onChange) => getCarryCapacityStore().subscribe(() => onChange()),
    () => getCarryCapacityStore().getSnapshot(),
    () => getCarryCapacityStore().getSnapshot(),
  );
}

/** Re-render quando loadout confirmado muda (PP na sidebar). */
export function useConfirmedLoadoutKey(): string {
  return useSyncExternalStore(
    (onChange) => getGlobalPlayerStore().subscribe(() => onChange()),
    () => getGlobalPlayerStore().getConfirmedLoadout().join('\0'),
    () => '',
  );
}

/** Re-render grade SET quando inventário muda. */
export function useEquipmentGridRevision(): number {
  return useSyncExternalStore(
    (onChange) => getPlayerItemStore().subscribe(() => onChange()),
    () => getPlayerItemStore().getSnapshot().revision,
    () => 0,
  );
}
