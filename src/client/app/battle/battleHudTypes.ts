import type { BattleMenuMove } from '../../hud/battleMenuMoves.js';
import type { BattleConsumableRow } from '../../hud/battleConsumables.js';
import type { ActiveStatusChip } from '../../hud/activeStatusAdapter.js';
import type { GameStoreBattleState, GameStoreBattleStatus } from '../../state/GameStore.js';
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

/** Metadados de sessão espelhados do GameStore autoritativo. */
export type BattleHudSession = {
  readonly status: GameStoreBattleStatus;
  readonly phase: string | null;
  readonly timerSeconds: number | null;
  readonly isMyTurn: boolean;
};

/** Estado unificado da HUD de combate (Zustand + facade). */
export type BattleHudState = BattleHudSession & {
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

/** @deprecated Use `BattleHudState` */
export type BattleHudBridgeSnapshot = BattleHudState;

/** @deprecated Use `BattleHudSession` */
export type BattleData = BattleHudSession;

export function battleSessionFromGameStore(battle: GameStoreBattleState): BattleHudSession {
  return {
    status: battle.status,
    phase: battle.phase,
    timerSeconds: battle.timerSeconds,
    isMyTurn: battle.isMyTurn,
  };
}
