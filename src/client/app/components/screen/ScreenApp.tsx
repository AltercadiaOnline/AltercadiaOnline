import { useEffect } from 'react';
import { useAppScreen } from '../../hooks/useAppScreen.js';
import { markReactScreenRuntimeReady } from '../../shell/screenSurface.js';
import { AuthScreen } from './AuthScreen.js';
import { AuthScreenLegacy } from './AuthScreen.legacy.js';
import { AUTH_HUD_TEST_LAYOUT } from './authHudTestFlag.js';
import { CharSelectScreen } from './CharSelectScreen.js';

/** Router da camada screen — login e char select (online-react-v1). */
export function ScreenApp() {
  const { activeScreen } = useAppScreen();

  useEffect(() => {
    markReactScreenRuntimeReady(true);
    return () => markReactScreenRuntimeReady(false);
  }, []);

  if (activeScreen === 'login-screen') {
    return AUTH_HUD_TEST_LAYOUT ? <AuthScreen /> : <AuthScreenLegacy />;
  }

  if (activeScreen === 'char-select-screen') {
    return <CharSelectScreen />;
  }

  return null;
}
