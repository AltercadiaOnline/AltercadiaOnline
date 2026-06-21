import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { isOnlineReactFrontend } from './clientArchitecture.js';

/** HUD in-game React — online-react-v1 com superfície hud montada. */
export function isReactGameHudUiEnabled(): boolean {
  if (!isOnlineReactFrontend()) return false;
  const inGame = getAppScreenBridge().snapshot().activeScreen === 'game-container';
  return inGame && getGameUiBridge().isSurfaceMounted('hud');
}