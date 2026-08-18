import { parseStaticNetworkHudSnapshot, type StaticNetworkHudSnapshot } from '../../shared/static/staticNetworkTypes.js';

type MirrorListener = () => void;

const listeners = new Set<MirrorListener>();
let snapshot: StaticNetworkHudSnapshot | null = null;
let revision = 0;

function notify(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

export function subscribeStaticNetworkMirror(listener: MirrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStaticNetworkMirrorRevision(): number {
  return revision;
}

export function getMirroredStaticNetwork(): StaticNetworkHudSnapshot | null {
  return snapshot;
}

export function applyStaticNetworkHudSnapshot(next: StaticNetworkHudSnapshot): void {
  snapshot = next;
  notify();
}

export function parseAndApplyStaticNetworkHudSnapshot(raw: unknown): void {
  const parsed = parseStaticNetworkHudSnapshot(raw);
  if (!parsed) return;
  applyStaticNetworkHudSnapshot(parsed);
}

export function resetStaticNetworkMirror(): void {
  snapshot = null;
  notify();
}
