import type { BattleReportSnapshot } from '../../../shared/combat/battleReportTypes.js';

type BattleStatsListener = (snapshot: BattleStatsSnapshot) => void;

export type BattleStatsSnapshot = {
  readonly active: boolean;
  readonly report: BattleReportSnapshot | null;
};

const DEFAULT_SNAPSHOT: BattleStatsSnapshot = {
  active: false,
  report: null,
};

class BattleStatsBridge {
  private snapshotState: BattleStatsSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<BattleStatsListener>();

  subscribe(listener: BattleStatsListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): BattleStatsSnapshot {
    return this.snapshotState;
  }

  present(report: BattleReportSnapshot): void {
    this.snapshotState = { active: true, report };
    this.emit();
  }

  dismiss(): void {
    this.snapshotState = DEFAULT_SNAPSHOT;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshotState);
    }
  }
}

type GlobalWithBattleStatsBridge = typeof globalThis & {
  __ALTERCADIA_BATTLE_STATS_BRIDGE__?: BattleStatsBridge;
};

export function getBattleStatsBridge(): BattleStatsBridge {
  const globalBridge = globalThis as GlobalWithBattleStatsBridge;
  if (!globalBridge.__ALTERCADIA_BATTLE_STATS_BRIDGE__) {
    globalBridge.__ALTERCADIA_BATTLE_STATS_BRIDGE__ = new BattleStatsBridge();
  }
  return globalBridge.__ALTERCADIA_BATTLE_STATS_BRIDGE__;
}
