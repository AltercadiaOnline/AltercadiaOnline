import {
  createIdlePvpJumbotronSnapshot,
  isPvpJumbotronSnapshot,
  type PvpJumbotronSnapshot,
} from '../../shared/combat/pvp/pvpJumbotronSnapshot.js';

let current: PvpJumbotronSnapshot = createIdlePvpJumbotronSnapshot();

export function getPvpJumbotronMirror(): PvpJumbotronSnapshot {
  return current;
}

export function applyPvpJumbotronSnapshot(snapshot: PvpJumbotronSnapshot): void {
  current = snapshot;
}

export function parseAndApplyPvpJumbotronSnapshot(raw: unknown): void {
  if (!isPvpJumbotronSnapshot(raw)) return;
  current = raw;
}

export function resetPvpJumbotronMirror(): void {
  current = createIdlePvpJumbotronSnapshot();
}
