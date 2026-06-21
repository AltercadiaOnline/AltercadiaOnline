import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';

export type LootCasinoView = 'hidden' | 'loading' | 'error' | 'screen';

export type LootCasinoHudSnapshot = {
  readonly view: LootCasinoView;
  readonly battleId: string | null;
  readonly lootId: string | null;
  readonly slots: readonly LootRevealSlot[];
  readonly errorMessage: string | null;
  readonly spinning: boolean;
  readonly hubDimmed: boolean;
};

type LootCasinoHudListener = (snapshot: LootCasinoHudSnapshot) => void;

const EMPTY_SLOTS: readonly LootRevealSlot[] = [];

const DEFAULT_SNAPSHOT: LootCasinoHudSnapshot = {
  view: 'hidden',
  battleId: null,
  lootId: null,
  slots: EMPTY_SLOTS,
  errorMessage: null,
  spinning: false,
  hubDimmed: false,
};

class LootCasinoHudBridge {
  private snapshotState: LootCasinoHudSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<LootCasinoHudListener>();

  subscribe(listener: LootCasinoHudListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): LootCasinoHudSnapshot {
    return this.snapshotState;
  }

  showLoading(battleId: string): void {
    this.snapshotState = {
      view: 'loading',
      battleId,
      lootId: null,
      slots: EMPTY_SLOTS,
      errorMessage: null,
      spinning: false,
      hubDimmed: this.snapshotState.hubDimmed,
    };
    this.emit();
  }

  presentScreen(battleId: string, lootId: string, slots: readonly LootRevealSlot[]): void {
    this.snapshotState = {
      view: 'screen',
      battleId,
      lootId,
      slots,
      errorMessage: null,
      spinning: false,
      hubDimmed: this.snapshotState.hubDimmed,
    };
    this.emit();
  }

  showError(message: string, battleId: string | null = this.snapshotState.battleId): void {
    this.snapshotState = {
      view: 'error',
      battleId,
      lootId: null,
      slots: EMPTY_SLOTS,
      errorMessage: message,
      spinning: false,
      hubDimmed: false,
    };
    this.emit();
  }

  setSpinning(spinning: boolean): void {
    if (this.snapshotState.spinning === spinning) return;
    this.snapshotState = { ...this.snapshotState, spinning };
    this.emit();
  }

  setHubDimmed(hubDimmed: boolean): void {
    if (this.snapshotState.hubDimmed === hubDimmed) return;
    this.snapshotState = { ...this.snapshotState, hubDimmed };
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

type GlobalWithLootCasinoHudBridge = typeof globalThis & {
  __ALTERCADIA_LOOT_CASINO_HUD_BRIDGE__?: LootCasinoHudBridge;
};

export function getLootCasinoHudBridge(): LootCasinoHudBridge {
  const globalBridge = globalThis as GlobalWithLootCasinoHudBridge;
  if (!globalBridge.__ALTERCADIA_LOOT_CASINO_HUD_BRIDGE__) {
    globalBridge.__ALTERCADIA_LOOT_CASINO_HUD_BRIDGE__ = new LootCasinoHudBridge();
  }
  return globalBridge.__ALTERCADIA_LOOT_CASINO_HUD_BRIDGE__;
}

export function isReactLootCasinoEnabled(): boolean {
  return document.body.dataset.reactBattleHudUi === '1';
}
