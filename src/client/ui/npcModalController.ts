import { windowManager } from '../app/panels/worldWindowController.js';
import { getReactDialogueHandle } from '../app/panels/dialogueReactBridge.js';
import { closeSurvivalGuideCard } from './components/SurvivalGuideCard.js';
import {
  endWorldHudInteractionSession,
  forceEndWorldHudInteractionSession,
} from '../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType, type UiWindowId } from './uiEvents.js';
import type { Player } from '../entities/Player.js';

export type NpcDialoguePanelHandle = {
  isOpen(): boolean;
  dismissWithoutWorldSession(): void;
};

type NpcModalControllerDeps = {
  readonly getPlayer: () => Player;
};

let deps: NpcModalControllerDeps | null = null;

const NPC_MODAL_WINDOWS: readonly UiWindowId[] = [
  'dialogue',
  'vendorShop',
  'laboratoryShop',
  'petTrainerShop',
  'tournamentBet',
  'rankingMonitor',
  'refractionBooth',
];

export function bindNpcModalController(nextDeps: NpcModalControllerDeps): void {
  deps = nextDeps;
}

export function resetNpcModalController(): void {
  deps = null;
}

/** Fecha HUDs de NPC, libera trava de mundo e restaura controle do mouse. */
export function closeAllNpcModals(explicitDialogue?: NpcDialoguePanelHandle): void {
  closeSurvivalGuideCard();

  const snapshot = endWorldHudInteractionSession();
  forceEndWorldHudInteractionSession();

  if (snapshot) {
    uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
  }

  const player = deps?.getPlayer();
  if (player) {
    player.isLocked = false;
  }

  const dialogue = explicitDialogue ?? getReactDialogueHandle() ?? null;
  if (dialogue?.isOpen()) {
    dialogue.dismissWithoutWorldSession();
  }

  for (const windowId of NPC_MODAL_WINDOWS) {
    if (windowId === 'dialogue') continue;
    windowManager.close(windowId);
  }
}
