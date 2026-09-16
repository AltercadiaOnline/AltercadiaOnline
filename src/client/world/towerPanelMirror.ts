/**
 * Espelho leve do snapshot da Torre (intent-result / tower-run-sync) — só UI.
 */

import type { TowerHudPublicSnapshot } from '../../shared/tower/towerTypes.js';

export type TowerPanelMirrorSnapshot = TowerHudPublicSnapshot;

type Listener = () => void;

let snapshot: TowerPanelMirrorSnapshot | null = null;
const listeners = new Set<Listener>();

export function getTowerPanelMirror(): TowerPanelMirrorSnapshot | null {
  return snapshot;
}

export function setTowerPanelMirror(next: TowerPanelMirrorSnapshot | null): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeTowerPanelMirror(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function tryApplyTowerPanelMirrorFromIntentData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  if (
    !('party' in record)
    && !('leaderboard' in record)
    && !('progress' in record)
    && !('towerBusy' in record)
  ) {
    return false;
  }
  setTowerPanelMirror({
    party: (record.party as TowerPanelMirrorSnapshot['party']) ?? null,
    progress: (record.progress as TowerPanelMirrorSnapshot['progress']) ?? null,
    fame: typeof record.fame === 'number' ? record.fame : 0,
    xpBuff: (record.xpBuff as TowerPanelMirrorSnapshot['xpBuff']) ?? null,
    leaderboard: Array.isArray(record.leaderboard)
      ? (record.leaderboard as TowerPanelMirrorSnapshot['leaderboard'])
      : [],
    towerBusy: Boolean(record.towerBusy),
    partyCreateCooldownEndsAtServerMs:
      typeof record.partyCreateCooldownEndsAtServerMs === 'number'
        ? record.partyCreateCooldownEndsAtServerMs
        : null,
  });
  return true;
}
