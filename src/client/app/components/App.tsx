import { lazy, Suspense } from 'react';
import { GameShell } from './GameShell.js';
import { GameHudSidebar } from './hud/GameHudSidebar.js';
import { useGameStore } from '../store/gameStore.js';

const WorldSceneShell = lazy(async () => {
  const module = await import('./world/WorldSceneShell.js');
  return { default: module.WorldSceneShell };
});

const BattleHUD = lazy(async () => {
  const module = await import('./battle/BattleHUD.js');
  return { default: module.BattleHUD };
});

/** HUD in-game — alterna World / Battle via viewMode (Zustand). */
export function App() {
  const viewMode = useGameStore((state) => state.viewMode);
  const inGame = useGameStore((state) => state.inGame);

  return (
    <GameShell>
      {inGame ? <GameHudSidebar /> : null}

      {inGame && viewMode === 'world' ? (
        <Suspense fallback={null}>
          <WorldSceneShell />
        </Suspense>
      ) : null}
      {inGame && viewMode === 'battle' ? (
        <Suspense fallback={null}>
          <BattleHUD />
        </Suspense>
      ) : null}
    </GameShell>
  );
}
