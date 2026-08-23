import type { ZoneHolderRecord } from '../../shared/world/zoneBypassStore.js';
import { readWorldScopedJson, writeWorldScopedJson } from './scopedPersistenceFiles.js';
import { getActivePersistenceStorage } from './storage/persistenceStorageRegistry.js';

type ZoneBypassHoldersFile = {
  readonly holders: Record<string, ZoneHolderRecord>;
  readonly updatedAt: number;
};

export async function loadZoneBypassHolderPersistence(): Promise<Record<string, ZoneHolderRecord>> {
  if (!getActivePersistenceStorage().isDurable()) return {};

  const snapshot = await readWorldScopedJson<ZoneBypassHoldersFile>('zone-bypass-holders.json');
  if (!snapshot?.holders || typeof snapshot.holders !== 'object') return {};
  return snapshot.holders;
}

export async function persistZoneBypassHolders(
  holders: Record<string, ZoneHolderRecord>,
): Promise<void> {
  if (!getActivePersistenceStorage().isDurable()) return;

  await writeWorldScopedJson('zone-bypass-holders.json', {
    holders,
    updatedAt: Date.now(),
  });
}
