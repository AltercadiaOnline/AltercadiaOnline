import { useEffect, useState } from 'react';
import {
  getPlayerMarketStore,
  type PlayerMarketListing,
} from '../../ui/market/playerMarketStore.js';

export function useMarketHubPanelState(): readonly PlayerMarketListing[] {
  const [listings, setListings] = useState(() => getPlayerMarketStore().getListings());

  useEffect(() => getPlayerMarketStore().subscribe(setListings), []);

  return listings;
}
