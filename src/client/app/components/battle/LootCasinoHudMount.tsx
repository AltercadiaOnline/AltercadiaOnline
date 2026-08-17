import { useEffect, useState } from 'react';
import {
  getLootCasinoHudBridge,
  type LootCasinoHudSnapshot,
} from '../../bridge/lootCasinoHudBridge.js';
import { LootCasinoErrorPanel } from './LootCasinoErrorPanel.js';
import { LootCasinoLoadingPanel } from './LootCasinoLoadingPanel.js';
import { LootCasinoScreenPanel } from './LootCasinoScreenPanel.js';

function readSnapshot(): LootCasinoHudSnapshot {
  return getLootCasinoHudBridge().snapshot();
}

export function LootCasinoHudMount() {
  const [snapshot, setSnapshot] = useState<LootCasinoHudSnapshot>(() => readSnapshot());

  useEffect(() => getLootCasinoHudBridge().subscribe(setSnapshot), []);

  if (snapshot.view === 'hidden') {
    return null;
  }

  if (snapshot.view === 'loading') {
    return <LootCasinoLoadingPanel snapshot={snapshot} />;
  }

  if (snapshot.view === 'error') {
    return <LootCasinoErrorPanel snapshot={snapshot} />;
  }

  return <LootCasinoScreenPanel snapshot={snapshot} />;
}
