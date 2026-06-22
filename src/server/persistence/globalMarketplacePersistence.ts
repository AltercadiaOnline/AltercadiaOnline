import path from 'node:path';
import {
  exportGlobalMarketplaceListings,
  hydrateGlobalMarketplaceListings,
  type GlobalMarketListingRecord,
} from '../../Economy/globalMarketplaceStore.js';
import { readJsonFile, writeJsonFileAtomic } from './DatabaseUtils.js';
import { getPersistenceRuntimeConfig, isDurablePersistence } from './PersistenceGateway.js';

type GlobalMarketplaceSnapshot = {
  readonly listings: readonly GlobalMarketListingRecord[];
  readonly updatedAt: number;
};

function globalMarketplaceFilePath(dataDir: string): string {
  return path.join(dataDir, 'global-marketplace.json');
}

/** Carrega livro global de anúncios P2P (startup). */
export async function loadGlobalMarketplacePersistence(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  const snapshot = await readJsonFile<GlobalMarketplaceSnapshot>(
    globalMarketplaceFilePath(dataDir),
  );
  if (!snapshot?.listings?.length) return;
  hydrateGlobalMarketplaceListings(snapshot.listings);
}

/** Persiste livro global após mutações de marketplace. */
export async function persistGlobalMarketplaceSnapshot(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  await writeJsonFileAtomic(globalMarketplaceFilePath(dataDir), {
    listings: exportGlobalMarketplaceListings(),
    updatedAt: Date.now(),
  });
}
