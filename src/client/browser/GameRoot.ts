import { GameState as GameStateValue, type GameState } from '../../shared/game/gameState.js';
import { useGameState } from '../game/GameStateProvider.js';
import { requestReturnToExploration } from '../game/battleReturnToWorld.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import {
  mountBattleScreen,
  unmountBattleScreen,
  type BattleFinishedResult,
} from '../hud/index.js';
import { applyGameStateToScenes } from './sceneManager.js';

/**
 * Equivalente vanilla ao App.tsx — renderização condicional por gameState.
 *
 * ```tsx
 * {gameState === 'EXPLORATION' && <WorldMap />}
 * {gameState === 'BATTLE' && (
 *   <BattleScreen monsterId={activeMonsterId} onBattleFinished={(r) => endBattle()} />
 * )}
 * {gameState === 'TRANSITIONING' && <div className="loading-overlay">Carregando...</div>}
 * ```
 */
export function initGameRoot(root: ParentNode = document): () => void {
  return useGameState((gameState) => {
    renderGameRoot(gameState, root);
  });
}

export function renderGameRoot(gameState: GameState, root: ParentNode = document): void {
  applyGameStateToScenes(gameState);

  const activeMonsterId = getGlobalPlayerStore().getActiveEncounter()?.monsterId ?? null;

  if (gameState === GameStateValue.Exploration) {
    unmountBattleScreen();
    return;
  }

  if (gameState === GameStateValue.Transitioning) {
    unmountBattleScreen();
    syncLoadingOverlay(root, true);
    return;
  }

  if (gameState === GameStateValue.Battle) {
    syncLoadingOverlay(root, false);

    mountBattleScreen({
      monsterId: activeMonsterId,
      onBattleFinished: (result: BattleFinishedResult) => {
        handleBattleFinished(result);
      },
    });
  }
}

function syncLoadingOverlay(root: ParentNode, visible: boolean): void {
  const overlay = root.querySelector<HTMLElement>('#scene-transition');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !visible);
  overlay.classList.toggle('is-active', visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

/** onBattleFinished → transição BATTLE → EXPLORATION (mapa top-down). */
function handleBattleFinished(result: BattleFinishedResult): void {
  void requestReturnToExploration({
    victory: result.victory,
    ...(result.endReason !== undefined ? { endReason: result.endReason } : {}),
    ...(result.monsterId ? { monsterId: result.monsterId } : {}),
  });
}
