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
        <div className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(5,10,13,0.92)] backdrop-blur-sm">
          <div className="flex max-w-[320px] flex-col items-center gap-4 rounded-lg border border-white/15 bg-[#161b22] px-10 py-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[rgba(88,166,255,0.2)] border-t-[#58a6ff]" aria-hidden="true" />
            <p className="font-mono text-[0.95rem] text-[#e6edf3]">
              {overlay.initLoadingMessage}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
