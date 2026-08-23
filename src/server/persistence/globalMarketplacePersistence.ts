import {
  exportGlobalMarketplaceListings,
  hydrateGlobalMarketplaceListings,
  type GlobalMarketListingRecord,
} from '../../Economy/globalMarketplaceStore.js';
import { readAccountScopedJson, writeAccountScopedJson } from './scopedPersistenceFiles.js';
import { getActivePersistenceStorage } from './storage/persistenceStorageRegistry.js';

type GlobalMarketplaceSnapshot = {
  readonly listings: readonly GlobalMarketListingRecord[];
  readonly updatedAt: number;
};

/** Carrega livro global de anúncios P2P (startup). */
export async function loadGlobalMarketplacePersistence(): Promise<void> {
  if (!getActivePersistenceStorage().isDurable()) return;

  const snapshot = await readAccountScopedJson<GlobalMarketplaceSnapshot>(
    'global-marketplace.json',
  );
  if (!snapshot?.listings?.length) return;
  hydrateGlobalMarketplaceListings(snapshot.listings);
}

/** Persiste livro global após mutações de marketplace. */
export async function persistGlobalMarketplaceSnapshot(): Promise<void> {
  if (!getActivePersistenceStorage().isDurable()) return;

  await writeAccountScopedJson('global-marketplace.json', {
    listings: exportGlobalMarketplaceListings(),
    updatedAt: Date.now(),
  });
}
