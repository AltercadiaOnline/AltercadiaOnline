import { useEffect, useState } from 'react';
import {
  getAppScreenBridge,
  type AppScreenSnapshot,
} from '../bridge/appScreenBridge.js';

export function useAppScreen(): AppScreenSnapshot {
  const [screen, setScreen] = useState<AppScreenSnapshot>(
    () => getAppScreenBridge().snapshot(),
  );

  useEffect(() => getAppScreenBridge().subscribe(setScreen), []);

  return screen;
}
