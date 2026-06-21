/**
 * BattleScreen — shell de arena (sprites DOM legado) + log/chat store-only.
 */
import { BattleChat } from './BattleChat.js';
import { BattleLog } from './BattleLog.js';
import { BattleSprite, queryBattleSpriteFrames } from './BattleSprite.js';
import { initializeZoneAssets } from '../../loaders/CreatureAssetLoader.js';
import { getOpponentChatAuthorLabel } from './postBattleHonorContext.js';
import { tryOpenHonorCardFromChatAuthor as openHonorFromChat } from './postBattleHonorOpener.js';
import { getBattleHudBridge } from '../../app/bridge/battleHudBridge.js';
import {
  patchBattleRenderVisual,
  resetBattleRenderBridge,
  type BattleFighterStance,
} from '../../app/bridge/battleRenderBridge.js';
import { isPhaserRenderEngineActive } from '../../app/bridge/renderLayerBridge.js';

export { BattleLog, type BattleLogProps, LOG_COLORS } from './BattleLog.js';
export { BattleChat, type BattleChatProps, type BattleChatMessage } from './BattleChat.js';
export { BattleSprite, type BattleSpriteProps } from './BattleSprite.js';
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
let battleSpriteAlly: BattleSprite | null = null;
let battleSpriteFoe: BattleSprite | null = null;
let teardownCommandBar: (() => void) | null = null;
let mountedMonsterId: string | null = null;
let allyBattleStance: BattleFighterStance = 'idle';
let foeBattleStance: BattleFighterStance = 'idle';

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

  if (!isPhaserRenderEngineActive()) {
    battleSpriteFoe?.bindMonsterId(props.monsterId);
    battleSpriteAlly?.applyProps({ side: 'ally' });
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
  battleSpriteAlly?.clear();
  battleSpriteFoe?.clear();
  mountedMonsterId = null;
  allyBattleStance = 'idle';
  foeBattleStance = 'idle';
  resetBattleRenderBridge();
  getBattleHudBridge().closeDrawers();

  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.setAttribute('aria-hidden', 'true');
}

export function setBattlePortraitStance(
  side: 'ally' | 'foe',
  stance: 'idle' | 'attack',
): void {
  if (side === 'ally') {
    allyBattleStance = stance;
  } else {
    foeBattleStance = stance;
  }
  publishCurrentBattleRenderFrame();

  if (isPhaserRenderEngineActive()) return;

  const sprite = side === 'foe' ? battleSpriteFoe : battleSpriteAlly;
  sprite?.setStance(stance);
}

export function initBattleScreenUI(
  root: ParentNode = document,
  handlers: BattleCommandHandlers = {},
): () => void {
  ensureBattleScreenShell(root);
  void initializeZoneAssets('zone1');

  teardownCommandBar?.();
  teardownCommandBar = wireBattleChatBridge(root, handlers);

  return () => {
    unmountBattleScreenView(root);
    teardownCommandBar?.();
    teardownCommandBar = null;
    battleChatPanel?.destroy();
    battleChatPanel = null;
    battleLogPanel = null;
    battleSpriteAlly = null;
    battleSpriteFoe = null;
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

  if (isPhaserRenderEngineActive()) return;

  const frames = queryBattleSpriteFrames(root);
  if (frames.ally && !battleSpriteAlly) {
    battleSpriteAlly = new BattleSprite(frames.ally, { side: 'ally' });
  }
  if (frames.foe && !battleSpriteFoe) {
    battleSpriteFoe = new BattleSprite(frames.foe, { side: 'foe', monsterId: null });
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
