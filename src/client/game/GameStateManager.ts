/** @deprecated Use GameStateProvider — re-export de compatibilidade. */
export {
  getGameStateManager,
  resetGameStateManager,
  publishBattleFinished,
  startBattle,
  triggerBattle,
  endBattleFromContext as endBattle,
  enterBattleFromServer,
  useGameState,
  useGameStateContext,
  getGameStateContext,
  getGameState,
  setGameState,
  gameStateAcceptsInput,
  initGameStateProvider,
} from './GameStateProvider.js';
