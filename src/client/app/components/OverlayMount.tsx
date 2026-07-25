import { useEffect, useState } from 'react';
import { getBattleStatsBridge, type BattleStatsSnapshot } from '../bridge/battleStatsBridge.js';
import { getOverlayBridge, type OverlayState } from '../bridge/overlayBridge.js';
import { getLootCasinoHudBridge, type LootCasinoHudSnapshot } from '../bridge/lootCasinoHudBridge.js';
import { BattleStatisticsMount } from './battle/BattleStatisticsReportPanel.js';
import { BattleSurrenderConfirmPanel } from './battle/BattleSurrenderConfirmPanel.js';
import { LootCasinoHudMount } from './battle/LootCasinoHudMount.js';
import { PostBattleHudMount } from './battle/PostBattleHudMount.js';
import { PauseMenuPanel } from './world/PauseMenuPanel.js';

function readOverlayState(): OverlayState {
  return getOverlayBridge().snapshot();
}

function readLootCasinoSnapshot(): LootCasinoHudSnapshot {
  return getLootCasinoHudBridge().snapshot();
}

function readBattleStatsSnapshot(): BattleStatsSnapshot {
  return getBattleStatsBridge().snapshot();
}

export function OverlayMount() {
  const [overlay, setOverlay] = useState<OverlayState>(() => readOverlayState());
  const [lootCasino, setLootCasino] = useState<LootCasinoHudSnapshot>(() => readLootCasinoSnapshot());
  const [battleStats, setBattleStats] = useState<BattleStatsSnapshot>(() => readBattleStatsSnapshot());

  useEffect(() => getOverlayBridge().subscribe(setOverlay), []);
  useEffect(() => getLootCasinoHudBridge().subscribe(setLootCasino), []);
  useEffect(() => getBattleStatsBridge().subscribe((snapshot) => setBattleStats(snapshot)), []);

  return (
    <>
      <PauseMenuPanel />
      <PostBattleHudMount hubDimmed={lootCasino.hubDimmed} />
      <LootCasinoHudMount />
      <BattleStatisticsMount active={battleStats.active} report={battleStats.report} />
      <BattleSurrenderConfirmPanel />
      {overlay.initLoadingVisible ? (
        <div
          className="player-init-loading pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="player-init-loading__panel">
            <p className="player-init-loading__title">ALTERCADIA</p>
            <div className="player-init-loading__spinner" aria-hidden="true" />
            <p className="player-init-loading__message">
              {overlay.initLoadingMessage}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
