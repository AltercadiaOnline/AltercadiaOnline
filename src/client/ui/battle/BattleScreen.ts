/**
 * BattleScreen — shell de arena Canvas 2D + log/chat store-only.
 * Construct = só exploração. HUD React fica por cima.
 */
import { BattleChat } from './BattleChat.js';
import { BattleLog } from './BattleLog.js';
import { BattleSprite } from './BattleSprite.js';
import { getOpponentChatAuthorLabel } from './postBattleHonorContext.js';
import { tryOpenHonorCardFromChatAuthor as openHonorFromChat } from './postBattleHonorOpener.js';
import { getBattleHudBridge } from '../../app/bridge/battleHudBridge.js';
import {
  patchBattleRenderVisual,
  resetBattleRenderBridge,
  subscribeBattleRenderFrame,
  getBattleRenderFrame,
  type BattleFighterStance,
} from '../../app/bridge/battleRenderBridge.js';
import {
  BattleArenaCanvas,
  queryBattleArenaCanvas,
  type BattleArenaCue,
} from './BattleArenaCanvas.js';
import { consumeBattleBackgroundVariant } from './battleBackgroundSession.js';
import { isPetKindId } from '../../../shared/pet/petCatalog.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import { getPlayerPetStore } from '../pet/playerPetStore.js';
import { canPetEnterBattle } from '../../../shared/pet/petModel.js';

export { BattleLog, type BattleLogProps, LOG_COLORS } from './BattleLog.js';
export { BattleChat, type BattleChatProps, type BattleChatMessage } from './BattleChat.js';
export { BattleSprite, type BattleSpriteProps } from './BattleSprite.js';
export { BattleArenaCanvas } from './BattleArenaCanvas.js';
export { BATTLE_TERMINAL_THEME } from './battleTerminalShared.js';

export const BATTLE_SCREEN_ROOT_SELECTOR = '.battle-screen--terminal';

export type BattleScreenMountProps = {
  readonly monsterId: string | null;
  readonly onBattleFinished?: (result: { monsterId: string; victory: boolean }) => void;
};

export type BattleCommandHandlers = {
  readonly onMoveset?: () => void;
  readonly onItems?: () => void;
  readonly onSkipTurn?: () => void;
  readonly onSurrender?: () => void;
  readonly onChatMessage?: (message: string) => void;
};

let battleLogPanel: BattleLog | null = null;
let battleChatPanel: BattleChat | null = null;
let battleArena: BattleArenaCanvas | null = null;
let unsubBattlePetRender: (() => void) | null = null;
let teardownCommandBar: (() => void) | null = null;
let mountedMonsterId: string | null = null;
let allyBattleStance: BattleFighterStance = 'idle';
let foeBattleStance: BattleFighterStance = 'idle';
/** Fundo aplicado nesta batalha — evita consumir o contador em re-render do mesmo mount. */
let arenaBackgroundApplied = false;

/** Combate primeiro; se o snapshot ainda não tiver pet, usa o convocado da store. */
export function resolveBattleArenaPetKindId(): string | null {
  const frame = getBattleRenderFrame();
  if (frame?.pet.visible && frame.pet.kindId && isPetKindId(frame.pet.kindId)) {
    return frame.pet.kindId;
  }
  const summoned = getPlayerPetStore().getSnapshot();
  return summoned && canPetEnterBattle(summoned) ? summoned.kindId : null;
}

function syncArenaPetFromRenderFrame(): void {
  void battleArena?.bindPet(resolveBattleArenaPetKindId());
}

function attachArenaPetSync(): void {
  unsubBattlePetRender?.();
  if (!battleArena) return;
  unsubBattlePetRender = subscribeBattleRenderFrame(() => {
    syncArenaPetFromRenderFrame();
  });
}

function publishCurrentBattleRenderFrame(): void {
  patchBattleRenderVisual({
    monsterId: mountedMonsterId,
    allyStance: allyBattleStance,
    foeStance: foeBattleStance,
  });
}

export function getBattleLogPanel(): BattleLog | null {
  return battleLogPanel;
}

export function getBattleChatPanel(): BattleChat | null {
  return battleChatPanel;
}

export function getBattleArenaCanvas(): BattleArenaCanvas | null {
  return battleArena;
}

export function syncBattleChatOpponentAuthor(): void {
  battleChatPanel?.configureOpponentAuthor(getOpponentChatAuthorLabel(), (author) => {
    openHonorFromChat(author);
  });
}

export function getMountedBattleMonsterId(): string | null {
  return mountedMonsterId;
}

export function mountBattleScreenView(
  props: BattleScreenMountProps,
  root: ParentNode = document,
): void {
  ensureBattleScreenShell(root);
  mountedMonsterId = props.monsterId;

  if (battleArena) {
    attachArenaPetSync();
    // Fonte primária: encontro ativo (tem creatureId mesmo se o bicho já saiu do mundo).
    const encounter = getGlobalPlayerStore().getActiveEncounter();
    if (
      encounter?.creatureId
      && (!props.monsterId || encounter.monsterId === props.monsterId)
    ) {
      void battleArena.bindCreature(encounter.creatureId, encounter.monsterName);
    } else {
      void battleArena.bindMonster(props.monsterId);
    }
    void battleArena.bindPlayer();
    syncArenaPetFromRenderFrame();
    if (!arenaBackgroundApplied) {
      const variant = consumeBattleBackgroundVariant();
      void battleArena.applyBackground(variant);
      arenaBackgroundApplied = true;
    }
    battleArena.startLoop();
  }

  allyBattleStance = 'idle';
  foeBattleStance = 'idle';
  publishCurrentBattleRenderFrame();

  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.classList.remove('hidden');
  screen?.setAttribute('aria-hidden', 'false');
}

export function unmountBattleScreenView(root: ParentNode = document): void {
  clearBattleScreenPanels();
  battleArena?.clear();
  mountedMonsterId = null;
  allyBattleStance = 'idle';
  foeBattleStance = 'idle';
  arenaBackgroundApplied = false;
  resetBattleRenderBridge();
  getBattleHudBridge().closeDrawers();

  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.setAttribute('aria-hidden', 'true');
}

export function setBattlePortraitStance(
  side: 'ally' | 'foe',
  stance: 'idle' | 'attack',
  actorId?: string,
): void {
  if (side === 'ally') {
    allyBattleStance = stance;
  } else {
    foeBattleStance = stance;
  }
  publishCurrentBattleRenderFrame();
  battleArena?.setStance(side, stance, actorId);
}

export function triggerBattleArenaCue(
  side: 'ally' | 'foe',
  cue: BattleArenaCue,
  durationMs?: number,
  actorId?: string,
): void {
  battleArena?.triggerCue(side, cue, durationMs, actorId);
}

export function initBattleScreenUI(
  root: ParentNode = document,
  handlers: BattleCommandHandlers = {},
): () => void {
  ensureBattleScreenShell(root);

  teardownCommandBar?.();
  teardownCommandBar = wireBattleChatBridge(root, handlers);

  return () => {
    unmountBattleScreenView(root);
    unsubBattlePetRender?.();
    unsubBattlePetRender = null;
    teardownCommandBar?.();
    teardownCommandBar = null;
    battleChatPanel?.destroy();
    battleChatPanel = null;
    battleLogPanel = null;
    battleArena = null;
    mountedMonsterId = null;
  };
}

export function clearBattleScreenPanels(): void {
  battleLogPanel?.clear();
  battleChatPanel?.clear();
}

function ensureBattleScreenShell(root: ParentNode): void {
  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.setAttribute('data-theme', 'dark-terminal');

  if (!battleLogPanel) {
    battleLogPanel = new BattleLog(undefined, { messages: [] });
  }

  if (!battleChatPanel) {
    battleChatPanel = new BattleChat(root, {
      onSendMessage: () => undefined,
      localAuthor: 'YOU',
    });
    syncBattleChatOpponentAuthor();
  }

  if (!battleArena) {
    const canvas = queryBattleArenaCanvas(root);
    if (canvas) {
      battleArena = new BattleArenaCanvas(canvas);
      battleArena.setOnFoePicked((actorId) => {
        getBattleHudBridge().selectFoe?.(actorId);
      });
      attachArenaPetSync();
    }
  }
}

function wireBattleChatBridge(root: ParentNode, handlers: BattleCommandHandlers): () => void {
  if (battleChatPanel) {
    battleChatPanel.destroy();
    battleChatPanel = new BattleChat(root, {
      onSendMessage: (text) => handlers.onChatMessage?.(text),
      localAuthor: 'YOU',
    });
    syncBattleChatOpponentAuthor();
  }
  return () => undefined;
}
