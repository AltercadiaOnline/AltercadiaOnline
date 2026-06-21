import type { CombatUiHints } from '../../shared/combatWire.js';

import { BATTLE_TURN_CHOICE_BUDGET_MS } from '../../shared/combatWire.js';

import { canPlayerIssueCombatChoice, resolveCombatChoiceWindowKey } from '../../shared/combat/playerTurnChoice.js';

import { CombatEventType, type CombatEvent, type TurnUpdate } from '../../shared/events.js';

import type { CombatState } from '../../shared/types.js';

import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';

import { BattleTurnTimer } from './battleTurnTimer.js';

import { getCombatTurnGateway } from './CombatTurnGateway.js';

import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { getGameStore } from '../state/GameStore.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';



const NOT_YOUR_TURN_MESSAGE = 'Não é sua vez!';

const WAITING_OPPONENT_MESSAGE = 'Aguardando ação do oponente…';

const YOUR_TURN_MESSAGE = 'Sua vez — escolha um movimento';



type TurnGuardUi = {
  movesetContainer: HTMLElement | null;
};

/**
 * Trava de turno do Battle HUD — espelha `CombatUiHints.actionsEnabled` (SSOT servidor).
 * Cronômetro isolado em {@link BattleTurnTimer} — imune a re-render da paleta/mastery.
 */
export class TurnStateGuard {
  private isMyTurn = false;
  private playerActorId: string | null = null;
  private turnDeadlineMs: number | undefined;
  private turnPlaybackGraceMs = 0;
  private turnChoiceBudgetMs = BATTLE_TURN_CHOICE_BUDGET_MS;
  private lastTurnWindowKey: string | null = null;
  private lastUiTurnKey: string | null = null;
  private onChoiceWindowExpired: (() => void) | null = null;
  private readonly turnTimer: BattleTurnTimer;
  private readonly ui: TurnGuardUi = {
    movesetContainer: null,
  };

  constructor() {
    this.turnTimer = new BattleTurnTimer();

    this.turnTimer.setOnExpired(() => {

      if (!this.isMyTurn) return;

      this.isMyTurn = false;

      this.turnDeadlineMs = undefined;

      this.lastTurnWindowKey = null;

      this.applyTurnUi();

      this.syncTurnTimer();

      this.onChoiceWindowExpired?.();

    });

  }



  bindRoot(root: ParentNode = document): void {
    this.ui.movesetContainer = root.querySelector('#react-skill-palette-row')
      ?? root.querySelector('#skill-palette-row');
    this.applyTurnUi();
    this.syncTurnTimer();
  }



  setOnChoiceWindowExpired(handler: (() => void) | null): void {

    this.onChoiceWindowExpired = handler;

  }



  reset(): void {

    this.turnTimer.reset();

    this.isMyTurn = false;

    this.playerActorId = null;

    this.turnDeadlineMs = undefined;

    this.turnPlaybackGraceMs = 0;

    this.turnChoiceBudgetMs = BATTLE_TURN_CHOICE_BUDGET_MS;

    this.lastTurnWindowKey = null;

    this.lastUiTurnKey = null;

    getGameStore().updateBattleState({
      status: 'idle',
      phase: null,
      timerSeconds: null,
      isMyTurn: false,
    });

    this.applyTurnUi();

  }



  getIsMyTurn(): boolean {

    return this.isMyTurn;

  }



  canUseSkill(): boolean {

    if (!this.isMyTurn) return false;

    if (getPendingIntentRegistry().isCombatVfxAnimating()) return false;

    if (getCombatTurnGateway()?.isBlocked()) return false;

    if (this.turnDeadlineMs !== undefined && Date.now() >= this.turnDeadlineMs) {

      return false;

    }

    return true;

  }



  rejectSkillAttempt(): void {

    getBattleLogPanel()?.appendAlert(NOT_YOUR_TURN_MESSAGE);

  }



  onCombatEvent(event: CombatEvent, playerActorId: string): void {

    this.playerActorId = playerActorId;



    switch (event.type) {

      case CombatEventType.TURN_START:

      case CombatEventType.BATTLE_STATE_UPDATE:

        this.applyTurnStart(event.payload, playerActorId);

        break;

      case CombatEventType.TURN_RESOLVED:

        this.applyTurnEnd();

        break;

      default:

        break;

    }

  }



  syncFromDispatch(state: CombatState, ui: CombatUiHints): void {

    this.playerActorId = ui.playerActorId;

    const serverChoiceOpen = canPlayerIssueCombatChoice(state, ui.playerActorId);
    const deadlineOpen = ui.turnDeadlineMs === undefined || Date.now() < ui.turnDeadlineMs;
    const nextTurn = serverChoiceOpen && deadlineOpen;

    const choiceKey = nextTurn

      ? resolveCombatChoiceWindowKey(state, ui.playerActorId)

      : null;

    const turnWindowKey = choiceKey

      ? `${state.battleId}:${choiceKey.turn}:${choiceKey.allianceSlot}`

      : `${state.battleId}:idle`;

    const nextDeadline = nextTurn ? ui.turnDeadlineMs : undefined;

    const uiTurnKey = `${nextTurn ? 1 : 0}`;

    this.isMyTurn = nextTurn;



    const turnWindowChanged = turnWindowKey !== this.lastTurnWindowKey;

    if (turnWindowChanged) {

      this.lastTurnWindowKey = turnWindowKey;

      this.turnDeadlineMs = nextDeadline;

      this.turnPlaybackGraceMs = nextTurn

        ? Math.max(0, ui.turnPlaybackGraceMs ?? 0)

        : 0;

      this.turnChoiceBudgetMs = nextTurn

        ? (ui.turnChoiceBudgetMs ?? BATTLE_TURN_CHOICE_BUDGET_MS)

        : BATTLE_TURN_CHOICE_BUDGET_MS;

      this.syncTurnTimer();

    } else if (nextTurn && this.turnDeadlineMs === undefined && nextDeadline !== undefined) {

      this.turnDeadlineMs = nextDeadline;

      this.syncTurnTimer();

    }



    if (uiTurnKey !== this.lastUiTurnKey || turnWindowChanged) {

      this.lastUiTurnKey = uiTurnKey;

      this.applyTurnUi();

    }

    getGameStore().updateBattleState({
      status: nextTurn ? 'choosing' : 'waiting',
      phase: nextTurn ? 'CHOOSING' : null,
      timerSeconds:
        nextTurn && nextDeadline !== undefined
          ? Math.max(0, (nextDeadline - Date.now()) / 1000)
          : null,
      isMyTurn: nextTurn,
    });

  }



  private applyTurnStart(payload: TurnUpdate, playerActorId: string): void {

    const isPlayerWindow =

      payload.phase === 'CHOOSING'

      && payload.activeActorId === playerActorId;

    if (isPlayerWindow === this.isMyTurn) return;



    this.isMyTurn = isPlayerWindow;

    if (!isPlayerWindow) {

      this.turnDeadlineMs = undefined;

      this.lastTurnWindowKey = null;

      this.applyTurnUi();

      this.syncTurnTimer();

    }

  }



  private applyTurnEnd(): void {

    if (!this.isMyTurn) return;

    this.isMyTurn = false;

    this.turnDeadlineMs = undefined;

    this.lastTurnWindowKey = null;

    this.applyTurnUi();

    this.syncTurnTimer();

  }



  private applyTurnUi(): void {
    const blocked = !this.isMyTurn;
    const moveset = this.ui.movesetContainer;

    if (moveset) {
      moveset.classList.toggle('turn-guard--blocked', blocked);
      moveset.classList.toggle('is-disabled', blocked);
      moveset.toggleAttribute('aria-disabled', blocked);
    }

    getBattleHudBridge().setPaletteTurnBlocked(blocked);
    const phaseText = this.isMyTurn
      ? YOUR_TURN_MESSAGE
      : WAITING_OPPONENT_MESSAGE;
    getBattleHudBridge().setTurnPhase(phaseText, this.isMyTurn);
  }



  private syncTurnTimer(): void {
    if (this.isMyTurn && this.turnDeadlineMs !== undefined) {
      this.turnTimer.sync({
        enabled: true,
        deadlineMs: this.turnDeadlineMs,
        choiceBudgetMs: this.turnChoiceBudgetMs,
        playbackGraceMs: this.turnPlaybackGraceMs,
      }, this.lastTurnWindowKey);
      return;
    }

    this.turnTimer.sync({
      enabled: this.isMyTurn,
    }, this.lastTurnWindowKey);
  }

}



let activeGuard: TurnStateGuard | null = null;



export function getTurnStateGuard(): TurnStateGuard {

  if (!activeGuard) activeGuard = new TurnStateGuard();

  return activeGuard;

}



export function initTurnStateGuard(root: ParentNode = document): TurnStateGuard {

  const guard = getTurnStateGuard();

  guard.bindRoot(root);

  return guard;

}



export function resetTurnStateGuard(): void {

  activeGuard?.reset();

}



/** @deprecated Alias legado — preferir TurnStateGuard / BattleTurnTimer. */

export const CombatTurnHUD = TurnStateGuard;


