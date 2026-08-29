import {
  createIdlePvpJumbotronSnapshot,
  type PvpJumbotronSnapshot,
} from '../../../shared/combat/pvp/pvpJumbotronSnapshot.js';

let current: PvpJumbotronSnapshot = createIdlePvpJumbotronSnapshot();

export function getPvpJumbotronSnapshot(): PvpJumbotronSnapshot {
  return current;
}

export function publishPvpJumbotronSnapshot(snapshot: PvpJumbotronSnapshot): void {
  current = snapshot;
}

export function resetPvpJumbotronAuthorityForTests(): void {
  current = createIdlePvpJumbotronSnapshot();
}
