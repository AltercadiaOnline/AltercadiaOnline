import { useGameStore, usePlayerData } from '../../store/gameStore.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';
import { WorldHUD } from './WorldHUD.js';
import { WorldPanelsLayer } from './WorldPanelsLayer.js';

function PlayerVitalsStrip() {
  const { displayName, level, hpCurrent, hpMax, gold } = usePlayerData();
  const hpPct = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 0;

  return (
    <div className="rounded-md border border-alter-border bg-alter-panel/90 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-alter-accent">
            {displayName}
          </div>
          <div className="mt-0.5 text-[9px] tracking-[0.12em] text-white/60">
            Nível {level}
          </div>
        </div>
        <div className="min-w-[120px] text-right text-[9px] tracking-[0.1em] text-white/55">
          {gold.voltsFormatted} · {gold.alterFormatted}
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-alter-accent transition-[width] duration-300"
          style={{ width: `${hpPct}%` }}
          role="progressbar"
          aria-valuenow={hpCurrent}
          aria-valuemin={0}
          aria-valuemax={hpMax}
          aria-label="Vida do operativo"
        />
      </div>
      <div className="mt-1 text-[9px] tracking-[0.08em] text-white/45">
        {hpCurrent}/{hpMax} HP
      </div>
    </div>
  );
}

/**
 * Shell da cena World — UI React acima da render layer (canvas legado ou Phaser).
 * Render fica em #game-render-host; este componente monta HUD + painéis.
 */
export function WorldSceneShell() {
  const worldHudActive = useGameStore((state) => state.worldHudActive);
  const renderEngine = useGameStore((state) => state.renderEngine);

  if (!worldHudActive) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: UI_LAYER_Z_INDEX.worldSceneShell }}
      data-ui-surface="world-scene-shell"
      data-render-engine={renderEngine}
    >
      <header className="pointer-events-auto absolute left-3 top-3 max-w-[min(320px,92vw)]">
        <PlayerVitalsStrip />
      </header>

      <WorldHUD />
      <WorldPanelsLayer />
    </div>
  );
}
