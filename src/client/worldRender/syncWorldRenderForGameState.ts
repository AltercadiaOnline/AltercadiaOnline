// @ts-nocheck
import { GameState as GameStateValue } from '../../shared/game/gameState.js';
import { setWorldRenderMode } from './bootOnlineWorldRender.js';
/**
 * Construct = só exploração.
 * Em BATTLE a arena é canvas DOM — o mundo fica pausado/escondido em modo exploration
 * para o Sair restaurar exatamente de onde o jogador parou.
 */
export function syncWorldRenderForGameState(state) {
    if (state === GameStateValue.Exploration
        || state === GameStateValue.Battle
        || state === GameStateValue.Transitioning) {
        setWorldRenderMode('exploration');
    }
}
