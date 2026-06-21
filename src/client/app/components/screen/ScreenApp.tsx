import { useEffect } from 'react';
import { useAppScreen } from '../../hooks/useAppScreen.js';
import { markReactScreenRuntimeReady } from '../../shell/screenSurface.js';
import { AuthScreen } from './AuthScreen.js';
import { CharSelectScreen } from './CharSelectScreen.js';

/** Router da camada screen — login e char select (online-react-v1). */
export function ScreenApp() {
  const { activeScreen } = useAppScreen();

  useEffect(() => {
    markReactScreenRuntimeReady(true);
    return () => markReactScreenRuntimeReady(false);
  }, []);

  if (activeScreen === 'login-screen') {
    return <AuthScreen />;
  }

  if (activeScreen === 'char-select-screen') {
    return <CharSelectScreen />;
  }

  return null;
}
