import type { BattleMenuMove } from '../../hud/BattleMenu.js';
import type { BattleConsumableRow } from '../../hud/battleConsumables.js';
import type { GameStoreBattleState } from '../../state/GameStore.js';
import {
  useBattleHudStore,
} from './battleHudStore.js';
import type {
  BattleHudChatLine,
  BattleHudFighterSnapshot,
  BattleHudLogLine,
  BattleHudPetSnapshot,
  BattleHudSession,
  BattleHudState,
  BattleHudTurnTimerSnapshot,
} from './battleHudTypes.js';

type BattleHudListener = (snapshot: BattleHudState) => void;

/**
 * Facade imperativa da HUD de combate — sem referência a DOM.
 * Legado e React escrevem/leem via store Zustand unificado.
 */
export class BattleHudController {
  subscribe(listener: BattleHudListener): () => void {
    return useBattleHudStore.subscribe(listener);
  }

  snapshot(): BattleHudState {
    return useBattleHudStore.getState();
  }

  markControllerReady(): void {
    useBattleHudStore.getState().markControllerReady();
  }

  setBattleHudActive(battleHudActive: boolean): void {
    useBattleHudStore.getState().setBattleHudActive(battleHudActive);
  }

  patchSession(session: Partial<BattleHudSession>): void {
    useBattleHudStore.getState().patchSession(session);
  }

  syncSessionFromGameStore(battle: GameStoreBattleState): void {
    useBattleHudStore.getState().syncSessionFromGameStore(battle);
  }

  setTurnPhase(turnPhase: string, turnPhaseActive = false): void {
    useBattleHudStore.getState().setTurnPhase(turnPhase, turnPhaseActive);
  }

  setCommandBarLocked(commandBarLocked: boolean): void {
    useBattleHudStore.getState().setCommandBarLocked(commandBarLocked);
  }

  setMovesetDrawerOpen(movesetDrawerOpen: boolean): void {
    useBattleHudStore.getState().setMovesetDrawerOpen(movesetDrawerOpen);
  }

  toggleItemsDrawer(): void {
    useBattleHudStore.getState().toggleItemsDrawer();
  }

  setItemsDrawerOpen(itemsDrawerOpen: boolean): void {
    useBattleHudStore.getState().setItemsDrawerOpen(itemsDrawerOpen);
  }

  closeDrawers(): void {
    useBattleHudStore.getState().closeDrawers();
  }

  setMovesetPalette(moves: readonly BattleMenuMove[], enabled: boolean): void {
    useBattleHudStore.getState().setMovesetPalette(moves, enabled);
  }

  setItemsPalette(rows: readonly BattleConsumableRow[], enabled: boolean): void {
    useBattleHudStore.getState().setItemsPalette(rows, enabled);
  }

  setPaletteTurnBlocked(paletteTurnBlocked: boolean): void {
    useBattleHudStore.getState().setPaletteTurnBlocked(paletteTurnBlocked);
  }

  setVitals(
    player: BattleHudFighterSnapshot | null,
    opponent: BattleHudFighterSnapshot | null,
    pet: BattleHudPetSnapshot,
  ): void {
    useBattleHudStore.getState().setVitals(player, opponent, pet);
  }

  patchFighterHp(side: 'player' | 'opponent' | 'pet', hp: number, maxHp: number): void {
    useBattleHudStore.getState().patchFighterHp(side, hp, maxHp);
  }

  setTurnTimer(timer: BattleHudTurnTimerSnapshot): void {
    useBattleHudStore.getState().setTurnTimer(timer);
  }

  appendLogLine(
    line: Omit<BattleHudLogLine, 'id' | 'timestamp'> & { readonly timestamp?: string },
  ): void {
    useBattleHudStore.getState().appendLogLine(line);
  }

  appendChatLine(author: string, text: string): void {
    useBattleHudStore.getState().appendChatLine(author, text);
  }

  resetSession(): void {
    useBattleHudStore.getState().resetSession();
  }

  clearLogLines(): void {
    useBattleHudStore.getState().clearLogLines();
  }

  clearChatLines(): void {
    useBattleHudStore.getState().clearChatLines();
  }
}

type GlobalWithBattleHudController = typeof globalThis & {
  __ALTERCADIA_BATTLE_HUD_CONTROLLER__?: BattleHudController;
};

export function getBattleHudController(): BattleHudController {
  const globalController = globalThis as GlobalWithBattleHudController;
  if (!globalController.__ALTERCADIA_BATTLE_HUD_CONTROLLER__) {
    globalController.__ALTERCADIA_BATTLE_HUD_CONTROLLER__ = new BattleHudController();
  }
  return globalController.__ALTERCADIA_BATTLE_HUD_CONTROLLER__;
}

/** @deprecated Use `getBattleHudController` */
export function getBattleHudBridge(): BattleHudController {
  return getBattleHudController();
}

export function isReactBattleHudEnabled(): boolean {
  return document.body.dataset.reactBattleHudUi === '1';
}
