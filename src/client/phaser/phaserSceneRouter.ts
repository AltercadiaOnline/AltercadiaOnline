import type { GameState } from '../../shared/game/gameState.js';
import { GameState as GameStateValue } from '../../shared/game/gameState.js';
import {
  getRenderLayerBridge,
  isPhaserRenderEngineActive,
  type ActivePhaserScene,
} from '../app/bridge/renderLayerBridge.js';
import {
  PHASER_BATTLE_SCENE_KEY,
} from './PhaserConfig.js';
import { isPhaserRuntimeActive, switchPhaserScene, switchPhaserToActiveMapInstance } from './PhaserRuntime.js';
import { getMapInstanceSceneManager } from './scenes/MapInstanceSceneManager.js';

function resolveTargetScene(state: GameState): ActivePhaserScene {
  if (state === GameStateValue.Exploration) return 'exploration';
  if (state === GameStateValue.Battle) return 'battle';
  return null;
}

/**
 * Troca cena Phaser conforme GameState — mantém instância do runtime viva.
 */
export function syncPhaserSceneForGameState(state: GameState): void {
  if (!isPhaserRenderEngineActive()) {
    getRenderLayerBridge().setActivePhaserScene(null);
    return;
  }

  const target = resolveTargetScene(state);
  if (!target) {
    return;
  }

  if (!isPhaserRuntimeActive()) {
    getRenderLayerBridge().setActivePhaserScene(target);
    return;
  }

  if (target === 'exploration') {
    const manager = getMapInstanceSceneManager();
    if (!manager.isInitialized()) {
      getRenderLayerBridge().setActivePhaserScene(target);
      return;
    }
    if (manager.isActiveMapLoadingOrRunning()) {
      getRenderLayerBridge().setActivePhaserScene(target);
      return;
    }
    switchPhaserToActiveMapInstance();
  } else {
    switchPhaserScene(PHASER_BATTLE_SCENE_KEY);
  }
  getRenderLayerBridge().setActivePhaserScene(target);
}
