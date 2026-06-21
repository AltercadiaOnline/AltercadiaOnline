import type { BattleVictoryUiReadyPayload } from '../../combat/battleUiEvents.js';
import type { PostBattleRewardsLootStatus } from '../../../shared/types/postBattleHub.js';
import { getGameUiBridge } from './gameUiBridge.js';

export type PostBattleHudSnapshot = {
  readonly active: boolean;
  readonly payload: BattleVictoryUiReadyPayload | null;
  readonly rewardsLootStatus: PostBattleRewardsLootStatus;
  readonly rewardsOpening: boolean;
  readonly exitPending: boolean;
};

type PostBattleHudListener = (snapshot: PostBattleHudSnapshot) => void;

const DEFAULT_SNAPSHOT: PostBattleHudSnapshot = {
  active: false,
  payload: null,
  rewardsLootStatus: 'unavailable',
  rewardsOpening: false,
  exitPending: false,
};

class PostBattleHudBridge {
  private snapshotState: PostBattleHudSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<PostBattleHudListener>();

  subscribe(listener: PostBattleHudListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): PostBattleHudSnapshot {
    return this.snapshotState;
  }

  present(
    payload: BattleVictoryUiReadyPayload,
    rewardsLootStatus: PostBattleRewardsLootStatus,
  ): void {
    this.snapshotState = {
      active: true,
      payload,
      rewardsLootStatus,
      rewardsOpening: false,
      exitPending: false,
    };
    this.emit();
  }

  setRewardsLootStatus(rewardsLootStatus: PostBattleRewardsLootStatus): void {
    if (!this.snapshotState.active) return;
    this.snapshotState = { ...this.snapshotState, rewardsLootStatus };
    this.emit();
  }

  setRewardsOpening(rewardsOpening: boolean): void {
    if (!this.snapshotState.active) return;
    this.snapshotState = { ...this.snapshotState, rewardsOpening };
    this.emit();
  }

  setExitPending(exitPending: boolean): void {
    if (!this.snapshotState.active) return;
    this.snapshotState = { ...this.snapshotState, exitPending };
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

type GlobalWithPostBattleHudBridge = typeof globalThis & {
  __ALTERCADIA_POST_BATTLE_HUD_BRIDGE__?: PostBattleHudBridge;
};

export function getPostBattleHudBridge(): PostBattleHudBridge {
  const globalBridge = globalThis as GlobalWithPostBattleHudBridge;
  if (!globalBridge.__ALTERCADIA_POST_BATTLE_HUD_BRIDGE__) {
    globalBridge.__ALTERCADIA_POST_BATTLE_HUD_BRIDGE__ = new PostBattleHudBridge();
  }
  return globalBridge.__ALTERCADIA_POST_BATTLE_HUD_BRIDGE__;
}

export function isReactPostBattleHudEnabled(): boolean {
  return getGameUiBridge().isSurfaceMounted('overlay');
}
