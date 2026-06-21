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

  let content;
  if (snapshot.view === 'loading') {
    content = <LootCasinoLoadingPanel snapshot={snapshot} />;
  } else if (snapshot.view === 'error') {
    content = <LootCasinoErrorPanel snapshot={snapshot} />;
  } else {
    content = <LootCasinoScreenPanel snapshot={snapshot} />;
  }

  return (
    <div className="loot-casino-hud-root pointer-events-auto fixed inset-0 z-[1000002]">
      {content}
    </div>
  );
}
