/**
 * Espelho leve do snapshot da Torre (intent-result) — só UI.
 */

export type TowerPanelMirrorSnapshot = {
  readonly party: {
    readonly partyId: string;
    readonly leaderPlayerId: string;
    readonly members: readonly {
      readonly playerId: string;
      readonly characterId: number;
      readonly displayName: string;
      readonly ready: boolean;
    }[];
    readonly run: {
      readonly floorIndex: number;
      readonly spawnUnlocked: boolean;
      readonly floorCleared: boolean;
      readonly canEvacuate: boolean;
    } | null;
  } | null;
  readonly progress: {
    readonly highestFloorCleared: number;
    readonly floorClearCounts: Readonly<Record<string, number>>;
  } | null;
  readonly fame: number;
  readonly xpBuff: { readonly percent: number; readonly expiresAtServerMs: number } | null;
  readonly leaderboard: readonly {
    readonly displayName: string;
    readonly highestFloorCleared: number;
    readonly winsAtHighestFloor: number;
  }[];
};

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
  if (!('party' in record) && !('leaderboard' in record) && !('progress' in record)) {
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
  });
  return true;
}
