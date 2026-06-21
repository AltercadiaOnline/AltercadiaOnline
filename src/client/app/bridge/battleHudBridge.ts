import type { BattleMenuMove } from '../../hud/BattleMenu.js';
import type { BattleConsumableRow } from '../../hud/battleConsumables.js';
import type { ActiveStatusChip } from '../../hud/activeStatusAdapter.js';
import type { BattleLogEmitter } from '../../ui/battle/battleLogColors.js';
import type { BattleLogLineKind, BattleLogTone } from '../../ui/battle/BattleNarrator.js';

export type BattleHudLogLine = {
  readonly id: string;
  readonly text: string;
  readonly emitter: BattleLogEmitter;
  readonly tone?: BattleLogTone;
  readonly kind?: BattleLogLineKind;
  readonly timestamp: string;
};

export type BattleHudChatLine = {
  readonly id: string;
  readonly author: string;
  readonly text: string;
};

export type BattleHudFighterSnapshot = {
  readonly name: string;
  readonly classLabel: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly hpRatio: number;
  readonly statuses: readonly ActiveStatusChip[];
  readonly isMirrorBot: boolean;
};

export type BattleHudPetSnapshot = {
  readonly visible: boolean;
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly hpRatio: number;
};

export type BattleHudTurnTimerSnapshot = {
  readonly enabled: boolean;
  readonly displaySec: number;
  readonly barRatio: number;
  readonly isUrgent: boolean;
};

export type BattleHudBridgeSnapshot = {
  readonly controllerReady: boolean;
  readonly battleHudActive: boolean;
  readonly logLines: readonly BattleHudLogLine[];
  readonly chatLines: readonly BattleHudChatLine[];
  readonly turnPhase: string;
  readonly turnPhaseActive: boolean;
  readonly commandBarLocked: boolean;
  readonly movesetDrawerOpen: boolean;
  readonly itemsDrawerOpen: boolean;
  readonly movesetMoves: readonly BattleMenuMove[];
  readonly movesetEnabled: boolean;
  readonly paletteTurnBlocked: boolean;
  readonly itemRows: readonly BattleConsumableRow[];
  readonly itemsEnabled: boolean;
  readonly player: BattleHudFighterSnapshot | null;
  readonly opponent: BattleHudFighterSnapshot | null;
  readonly pet: BattleHudPetSnapshot;
  readonly turnTimer: BattleHudTurnTimerSnapshot;
};

type BattleHudBridgeListener = (snapshot: BattleHudBridgeSnapshot) => void;

const MAX_LOG_LINES = 10;
const MAX_CHAT_LINES = 40;

let logLineSequence = 0;
let chatLineSequence = 0;

const DEFAULT_PET: BattleHudPetSnapshot = {
  visible: false,
  name: '—',
  hp: 0,
  maxHp: 1,
  hpRatio: 0,
};

const DEFAULT_TIMER: BattleHudTurnTimerSnapshot = {
  enabled: false,
  displaySec: 10,
  barRatio: 0,
  isUrgent: false,
};

const DEFAULT_SNAPSHOT: BattleHudBridgeSnapshot = {
  controllerReady: false,
  battleHudActive: false,
  logLines: [],
  chatLines: [],
  turnPhase: 'Aguardando…',
  turnPhaseActive: false,
  commandBarLocked: true,
  movesetDrawerOpen: false,
  itemsDrawerOpen: false,
  movesetMoves: [],
  movesetEnabled: false,
  paletteTurnBlocked: true,
  itemRows: [],
  itemsEnabled: false,
  player: null,
  opponent: null,
  pet: DEFAULT_PET,
  turnTimer: DEFAULT_TIMER,
};

function formatBattleLogTimestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

class BattleHudBridge {
  private snapshotState: BattleHudBridgeSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<BattleHudBridgeListener>();

  subscribe(listener: BattleHudBridgeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): BattleHudBridgeSnapshot {
    return this.snapshotState;
  }

  markControllerReady(): void {
    this.snapshotState = { ...this.snapshotState, controllerReady: true };
    this.emit();
  }

  setBattleHudActive(battleHudActive: boolean): void {
    this.snapshotState = { ...this.snapshotState, battleHudActive };
    this.emit();
  }

  setTurnPhase(turnPhase: string, turnPhaseActive = false): void {
    this.snapshotState = { ...this.snapshotState, turnPhase, turnPhaseActive };
    this.emit();
  }

  setCommandBarLocked(commandBarLocked: boolean): void {
    this.snapshotState = { ...this.snapshotState, commandBarLocked };
    this.emit();
  }

  setMovesetDrawerOpen(movesetDrawerOpen: boolean): void {
    this.snapshotState = { ...this.snapshotState, movesetDrawerOpen };
    this.emit();
  }

  toggleItemsDrawer(): void {
    this.snapshotState = {
      ...this.snapshotState,
      itemsDrawerOpen: !this.snapshotState.itemsDrawerOpen,
    };
    this.emit();
  }

  setItemsDrawerOpen(itemsDrawerOpen: boolean): void {
    this.snapshotState = { ...this.snapshotState, itemsDrawerOpen };
    this.emit();
  }

  closeDrawers(): void {
    this.snapshotState = {
      ...this.snapshotState,
      movesetDrawerOpen: false,
      itemsDrawerOpen: false,
    };
    this.emit();
  }

  setMovesetPalette(moves: readonly BattleMenuMove[], enabled: boolean): void {
    this.snapshotState = {
      ...this.snapshotState,
      movesetMoves: [...moves],
      movesetEnabled: enabled,
    };
    this.emit();
  }

  setItemsPalette(rows: readonly BattleConsumableRow[], enabled: boolean): void {
    this.snapshotState = {
      ...this.snapshotState,
      itemRows: [...rows],
      itemsEnabled: enabled,
    };
    this.emit();
  }

  setPaletteTurnBlocked(paletteTurnBlocked: boolean): void {
    this.snapshotState = { ...this.snapshotState, paletteTurnBlocked };
    this.emit();
  }

  setVitals(
    player: BattleHudFighterSnapshot | null,
    opponent: BattleHudFighterSnapshot | null,
    pet: BattleHudPetSnapshot,
  ): void {
    this.snapshotState = { ...this.snapshotState, player, opponent, pet };
    this.emit();
  }

  patchFighterHp(side: 'player' | 'opponent' | 'pet', hp: number, maxHp: number): void {
    const max = Math.max(1, maxHp);
    const hpRatio = Math.min(100, Math.max(0, (hp / max) * 100));

    if (side === 'pet') {
      this.snapshotState = {
        ...this.snapshotState,
        pet: {
          ...this.snapshotState.pet,
          hp,
          maxHp: max,
          hpRatio,
        },
      };
      this.emit();
      return;
    }

    const key = side === 'player' ? 'player' : 'opponent';
    const fighter = this.snapshotState[key];
    if (!fighter) return;

    this.snapshotState = {
      ...this.snapshotState,
      [key]: { ...fighter, hp, maxHp: max, hpRatio },
    };
    this.emit();
  }

  setTurnTimer(timer: BattleHudTurnTimerSnapshot): void {
    this.snapshotState = { ...this.snapshotState, turnTimer: timer };
    this.emit();
  }

  appendLogLine(
    line: Omit<BattleHudLogLine, 'id' | 'timestamp'> & { readonly timestamp?: string },
  ): void {
    const nextLines = [
      ...this.snapshotState.logLines,
      {
        id: `battle-log-${logLineSequence += 1}`,
        timestamp: line.timestamp ?? formatBattleLogTimestamp(),
        text: line.text,
        emitter: line.emitter,
        ...(line.tone !== undefined ? { tone: line.tone } : {}),
        ...(line.kind !== undefined ? { kind: line.kind } : {}),
      },
    ].slice(-MAX_LOG_LINES);

    this.snapshotState = { ...this.snapshotState, logLines: nextLines };
    this.emit();
  }

  appendChatLine(author: string, text: string): void {
    const nextLines = [
      ...this.snapshotState.chatLines,
      { id: `battle-chat-${chatLineSequence += 1}`, author, text },
    ].slice(-MAX_CHAT_LINES);

    this.snapshotState = { ...this.snapshotState, chatLines: nextLines };
    this.emit();
  }

  resetSession(): void {
    this.snapshotState = {
      ...DEFAULT_SNAPSHOT,
      controllerReady: this.snapshotState.controllerReady,
      battleHudActive: this.snapshotState.battleHudActive,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshotState);
    }
  }
}

type GlobalWithBattleHudBridge = typeof globalThis & {
  __ALTERCADIA_BATTLE_HUD_BRIDGE__?: BattleHudBridge;
};

export function getBattleHudBridge(): BattleHudBridge {
  const globalBridge = globalThis as GlobalWithBattleHudBridge;
  if (!globalBridge.__ALTERCADIA_BATTLE_HUD_BRIDGE__) {
    globalBridge.__ALTERCADIA_BATTLE_HUD_BRIDGE__ = new BattleHudBridge();
  }
  return globalBridge.__ALTERCADIA_BATTLE_HUD_BRIDGE__;
}

export function isReactBattleHudEnabled(): boolean {
  return document.body.dataset.reactBattleHudUi === '1';
}
