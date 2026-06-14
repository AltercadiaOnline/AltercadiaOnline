import type { MinimapSnapshot } from './minimapTypes.js';

let latestSnapshot: MinimapSnapshot | null = null;
const listeners = new Set<(snapshot: MinimapSnapshot) => void>();

export function publishMinimapSnapshot(snapshot: MinimapSnapshot): void {
  latestSnapshot = snapshot;
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function getMinimapSnapshot(): MinimapSnapshot | null {
  return latestSnapshot;
}

export function subscribeMinimapSnapshot(
  listener: (snapshot: MinimapSnapshot) => void,
): () => void {
  listeners.add(listener);
  if (latestSnapshot) {
    listener(latestSnapshot);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function resetMinimapState(): void {
  latestSnapshot = null;
  listeners.clear();
}
