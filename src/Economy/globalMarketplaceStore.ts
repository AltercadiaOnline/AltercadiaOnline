import type {
  MarketplaceBuyOrderRecord,
  MarketplaceListingRecord,
} from './marketplaceStore.js';

export type GlobalMarketListingRecord = MarketplaceListingRecord & {
  readonly sellerPlayerId: string;
  readonly sellerCharacterId: number;
};

const globalListings = new Map<string, GlobalMarketListingRecord>();

export function registerGlobalMarketListing(
  listing: GlobalMarketListingRecord,
): void {
  globalListings.set(listing.id, { ...listing });
}

export function unregisterGlobalMarketListing(listingId: string): void {
  globalListings.delete(listingId);
}

export function getGlobalMarketListing(listingId: string): GlobalMarketListingRecord | null {
  const entry = globalListings.get(listingId);
  return entry ? { ...entry } : null;
}

export function listGlobalMarketListings(): readonly GlobalMarketListingRecord[] {
  return [...globalListings.values()]
    .filter((entry) => entry.status === 'LISTED')
    .map((entry) => ({ ...entry }));
}

export function findCheapestGlobalListing(
  itemId: string,
  maxUnitPriceVolts: number,
): GlobalMarketListingRecord | null {
  const matches = listGlobalMarketListings()
    .filter((entry) => entry.itemId === itemId && entry.unitPriceVolts <= maxUnitPriceVolts)
    .sort((left, right) => {
      if (left.unitPriceVolts !== right.unitPriceVolts) {
        return left.unitPriceVolts - right.unitPriceVolts;
      }
      return left.createdAt - right.createdAt;
    });

  return matches[0] ?? null;
}

export function hydrateGlobalMarketplaceListings(
  listings: readonly GlobalMarketListingRecord[],
): void {
  globalListings.clear();
  for (const listing of listings) {
    globalListings.set(listing.id, { ...listing });
  }
}

export function exportGlobalMarketplaceListings(): readonly GlobalMarketListingRecord[] {
  return [...globalListings.values()].map((entry) => ({ ...entry }));
}

export function resetGlobalMarketplaceStore(): void {
  globalListings.clear();
}

export type { MarketplaceBuyOrderRecord, MarketplaceListingRecord };
