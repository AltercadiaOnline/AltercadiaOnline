import { useEffect } from 'react';
import { useAppScreen } from '../../hooks/useAppScreen.js';
import {
  isReactAuthScreenEnabled,
  isReactCharSelectScreenEnabled,
  markReactScreenRuntimeReady,
} from '../../shell/screenSurface.js';
import { AuthScreen } from './AuthScreen.js';
import { CharSelectScreen } from './CharSelectScreen.js';

/**
 * Router da camada screen — login e char select em React quando flags ativas.
 */
export function ScreenApp() {
  const { activeScreen } = useAppScreen();
  const reactAuth = isReactAuthScreenEnabled();
  const reactCharSelect = isReactCharSelectScreenEnabled();

  useEffect(() => {
    markReactScreenRuntimeReady(true);
    return () => markReactScreenRuntimeReady(false);
  }, []);

  if (reactAuth && activeScreen === 'login-screen') {
    return <AuthScreen />;
  }

  if (reactCharSelect && activeScreen === 'char-select-screen') {
    return <CharSelectScreen />;
  }

  return null;
}