import { useEffect, useState } from 'react';
import { getGameUiBridge, type GameUiBridgeSnapshot } from '../bridge/gameUiBridge.js';
import { getRenderLayerBridge, type RenderLayerSnapshot } from '../bridge/renderLayerBridge.js';
import { useGameStore, useViewMode } from '../store/gameStore.js';

function readUiSnapshot(): GameUiBridgeSnapshot {
  return getGameUiBridge().snapshot();
}

function readRenderSnapshot(): RenderLayerSnapshot {
  return getRenderLayerBridge().snapshot();
}

export function HybridHudFoundation() {
  const viewMode = useViewMode();
  const renderEngine = useGameStore((state) => state.renderEngine);
  const [uiSnapshot, setUiSnapshot] = useState<GameUiBridgeSnapshot>(() => readUiSnapshot());
  const [renderSnapshot, setRenderSnapshot] = useState<RenderLayerSnapshot>(() => readRenderSnapshot());

  useEffect(() => getGameUiBridge().subscribe(setUiSnapshot), []);
  useEffect(() => getRenderLayerBridge().subscribe(setRenderSnapshot), []);

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[922]">
      <div className="rounded-md border border-alter-border bg-alter-panel/90 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-alter-text shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        <div className="font-semibold text-alter-accent">Hybrid UI</div>
        <div className="mt-1 text-[9px] tracking-[0.16em] text-white/70">
          {uiSnapshot.mode} · {viewMode} · {renderEngine}
        </div>
        <div className="mt-1 text-[9px] tracking-[0.12em] text-white/55">
          phaser {renderSnapshot.phaserBooted ? 'on' : 'off'}
          {' · '}
          {Array.from(uiSnapshot.mountedSurfaces).join(' / ') || 'booting'}
        </div>
      </div>
    </div>
  );
}
