import { useEffect, useState } from 'react';
import {
  getWorldHudBridge,
  type WorldHudSnapshot,
} from '../bridge/worldHudBridge.js';

export function useWorldHudBridge(): WorldHudSnapshot {
  const [snapshot, setSnapshot] = useState<WorldHudSnapshot>(
    () => getWorldHudBridge().snapshot(),
  );

  useEffect(() => getWorldHudBridge().subscribe(setSnapshot), []);

  return snapshot;
}
