import type { GameState } from '../../shared/game/gameState.js';
import { GameState as GameStateValue } from '../../shared/game/gameState.js';
import { setWorldRenderMode } from './bootOnlineWorldRender.js';

/**
 * Construct = só exploração.
 * Em BATTLE a arena é canvas DOM — o runtime Construct fica com timeScale 0
 * para o Sair restaurar o mapa de onde o jogador parou.
 */
export function syncWorldRenderForGameState(state: GameState): void {
  if (state === GameStateValue.Battle) {
    setWorldRenderMode('battle');
    return;
  }
  setWorldRenderMode('exploration');
}
