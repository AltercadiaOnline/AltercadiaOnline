import { resetGame } from '../economy/economyLayer.js';
import { installSpawnMirrorPlayerGlobal, spawnMirrorPlayer } from './spawnMirrorPlayer.js';

declare global {
  interface Window {
    resetGame?: () => void;
    spawnMirrorPlayer?: () => void;
  }
}

/** Comandos de console para loop de testes sem servidor. */
export function installDevConsoleCommands(): void {
  installSpawnMirrorPlayerGlobal();

  window.resetGame = () => {
    resetGame();
    console.info('[Altercadia] MockEconomyService resetado ao estado inicial.');
  };

  window.spawnMirrorPlayer = spawnMirrorPlayer;
}
