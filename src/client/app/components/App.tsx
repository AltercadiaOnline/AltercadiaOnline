// @ts-nocheck
import { lazy, Suspense } from 'react';
import { GameShell } from './GameShell.js';
import { GameHudSidebar } from './hud/GameHudSidebar.js';
import { HudErrorBoundary } from './HudErrorBoundary.js';
import { useHudViewMode, useIsInGame } from '../hooks/useAppUiSurface.js';

const WorldSceneShell = lazy(async () => {
  const module = await import('./world/WorldSceneShell.js');
  return { default: module.WorldSceneShell };
});

const BattleHUD = lazy(async () => {
  const module = await import('./battle/BattleHUD.js');
  return { default: module.BattleHUD };
});

/**
 * HUD in-game — ownership limpo:
 * - Visível quando `appScreenBridge.activeScreen === 'game-container'`
 * - World vs Battle via `GameStateManager`
 * - Sidebar fixa: sempre montada (mundo e batalha); playfield não a cobre.
 */
export function App() {
  const inGame = useIsInGame();
  const viewMode = useHudViewMode();

  if (!inGame) {
    return <GameShell>{null}</GameShell>;
  }

  return (
    <GameShell>
      <HudErrorBoundary
        fallback={
          <aside className="game-hud-sidebar--persistent" data-ui-widget="game-sidebar" aria-label="HUD lateral">
            <div className="p-3 text-[10px] text-white/50">HUD indisponível</div>
          </aside>
        }
      >
        <GameHudSidebar />
      </HudErrorBoundary>

      {viewMode === 'world' ? (
        <HudErrorBoundary>
          <Suspense fallback={null}>
            <WorldSceneShell />
          </Suspense>
        </HudErrorBoundary>
      ) : null}

      {viewMode === 'battle' ? (
        <HudErrorBoundary>
          <Suspense fallback={null}>
            <BattleHUD />
          </Suspense>
        </HudErrorBoundary>
      ) : null}
    </GameShell>
  );
}
