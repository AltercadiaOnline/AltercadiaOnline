import { GameShell } from './GameShell.js';
import { HybridHudFoundation } from './HybridHudFoundation.js';
import { BattleHUD } from './battle/BattleHUD.js';
import { WorldSceneShell } from './world/WorldSceneShell.js';
import { useGameStore } from '../store/gameStore.js';
import { isHybridUiDebugEnabled } from '../shell/hybridUiDebug.js';

/**
 * HUD in-game — alterna World / Battle via viewMode (Zustand espelho do legado).
 * Screen (login) e overlay (loading/loot) montam em roots separados.
 */
export function App() {
  const viewMode = useGameStore((state) => state.viewMode);
  const inGame = useGameStore((state) => state.inGame);

  return (
    <GameShell>
      {isHybridUiDebugEnabled() ? <HybridHudFoundation /> : null}

      {inGame && viewMode === 'world' ? <WorldSceneShell /> : null}
      {inGame && viewMode === 'battle' ? <BattleHUD /> : null}
    </GameShell>
  );
}
