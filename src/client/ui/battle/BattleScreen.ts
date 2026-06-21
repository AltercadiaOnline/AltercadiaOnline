/**
 * BattleScreen — Altercadia Side-View · Dark Terminal
 *
 * Integrado ao GameStateManager via mountBattleScreenView / unmountBattleScreenView
 * (chamados por GameRoot em BATTLE / TRANSITIONING e por endBattle → onClearBattleSession).
 */
import { getMonsterRegistryEntry } from '../../../shared/world/monsterRegistry.js';
import { BattleChat } from './BattleChat.js';
import { BattleLog } from './BattleLog.js';
import { BattleSprite, queryBattleSpriteFrames } from './BattleSprite.js';
import { initializeZoneAssets } from '../../loaders/CreatureAssetLoader.js';
import { resolveBattleSpriteFromMonsterId } from './battleSpriteCatalog.js';
import { getOpponentChatAuthorLabel } from './postBattleHonorContext.js';
import { tryOpenHonorCardFromChatAuthor as openHonorFromChat } from './postBattleHonorOpener.js';
import { getBattleHudBridge, isReactBattleHudEnabled } from '../../app/bridge/battleHudBridge.js';
import { ensureBattleHudStubHost } from './battleHudStubHost.js';

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

export function getBattleLogPanel(): BattleLog | null {
  return battleLogPanel;
}

export function getBattleChatPanel(): BattleChat | null {
  return battleChatPanel;
}

/** Liga avatar clicável do oponente no chat da arena (PVP pós-duelo). */
export function syncBattleChatOpponentAuthor(): void {
  battleChatPanel?.configureOpponentAuthor(getOpponentChatAuthorLabel(), (author) => {
    openHonorFromChat(author);
  });
}

export function getMountedBattleMonsterId(): string | null {
  return mountedMonsterId;
}

/** Monta painéis e sprites quando gameState === BATTLE. */
export function mountBattleScreenView(
  props: BattleScreenMountProps,
  root: ParentNode = document,
): void {
  ensureBattleScreenShell(root);
  mountedMonsterId = props.monsterId;

  battleSpriteFoe?.bindMonsterId(props.monsterId);
  battleSpriteAlly?.applyProps({ side: 'ally' });
  syncOpponentLabel(props.monsterId, root);

  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.classList.remove('hidden');
  screen?.setAttribute('aria-hidden', 'false');
}

/**
 * Desmonta estado visual da batalha — limpa log, chat e sprites.
 * Invocado em endBattle() (onClearBattleSession) e ao entrar em TRANSITIONING.
 */
export function unmountBattleScreenView(root: ParentNode = document): void {
  clearBattleScreenPanels();
  battleSpriteAlly?.clear();
  battleSpriteFoe?.clear();
  mountedMonsterId = null;
  if (isReactBattleHudEnabled()) {
    getBattleHudBridge().closeDrawers();
  } else {
    ensureBattleHudStubHost(root).skillPaletteRow.classList.add('hidden');
    ensureBattleHudStubHost(root).battleItemsRow.classList.add('hidden');
  }

  const screen = root.querySelector<HTMLElement>(BATTLE_SCREEN_ROOT_SELECTOR);
  screen?.setAttribute('aria-hidden', 'true');
}

/** Inicializa wire dos comandos + instâncias dos sub-componentes (uma vez por sessão HUD). */
export function setBattlePortraitStance(
  side: 'ally' | 'foe',
  stance: 'idle' | 'attack',
): void {
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
  teardownCommandBar = wireBattleCommandBar(root, handlers);

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
    battleLogPanel = new BattleLog(root.querySelector('#battle-log'), { messages: [] });
  }

  if (!battleChatPanel) {
    battleChatPanel = new BattleChat(root, {
      onSendMessage: () => undefined,
      localAuthor: 'YOU',
    });
    syncBattleChatOpponentAuthor();
  }

  const frames = queryBattleSpriteFrames(root);
  if (frames.ally && !battleSpriteAlly) {
    battleSpriteAlly = new BattleSprite(frames.ally, { side: 'ally' });
  }
  if (frames.foe && !battleSpriteFoe) {
    battleSpriteFoe = new BattleSprite(frames.foe, { side: 'foe', monsterId: null });
  }
}

function syncOpponentLabel(monsterId: string | null, root: ParentNode): void {
  const label = root.querySelector<HTMLElement>('#battle-opponent-name');
  if (!label) return;

  if (!monsterId) {
    label.removeAttribute('data-monster-id');
    label.textContent = '—';
    return;
  }

  label.dataset.monsterId = monsterId;
  const registry = getMonsterRegistryEntry(monsterId);
  const catalog = resolveBattleSpriteFromMonsterId(monsterId);
  label.textContent = registry?.name ?? catalog?.name ?? monsterId;
}

function wireBattleCommandBar(root: ParentNode, handlers: BattleCommandHandlers): () => void {
  const stubs = ensureBattleHudStubHost(root);
  const movesetDrawer = stubs.skillPaletteRow;
  const itemsDrawer = stubs.battleItemsRow;
  const cleanups: (() => void)[] = [];

  if (battleChatPanel) {
    battleChatPanel.destroy();
    battleChatPanel = new BattleChat(root, {
      onSendMessage: (text) => handlers.onChatMessage?.(text),
      localAuthor: 'YOU',
    });
    syncBattleChatOpponentAuthor();
  }

  if (isReactBattleHudEnabled()) {
    return () => {
      for (const off of cleanups) off();
    };
  }

  const bar = root.querySelector<HTMLElement>('.battle-command-bar');

  const bind = (cmd: string, fn: () => void) => {
    const btn = bar?.querySelector<HTMLButtonElement>(`[data-battle-cmd="${cmd}"]`);
    if (!btn) return;
    const listener = () => fn();
    btn.addEventListener('click', listener);
    cleanups.push(() => btn.removeEventListener('click', listener));
  };

  bind('moveset', () => {
    itemsDrawer?.classList.add('hidden');
    movesetDrawer?.classList.toggle('hidden');
    handlers.onMoveset?.();
  });

  bind('items', () => {
    movesetDrawer?.classList.add('hidden');
    itemsDrawer?.classList.toggle('hidden');
    battleLogPanel?.append('ITEMS::open');
    handlers.onItems?.();
  });

  bind('skip', () => {
    battleLogPanel?.append('TURN::skip');
    handlers.onSkipTurn?.();
  });

  bind('surrender', () => {
    battleLogPanel?.append('COMBAT::surrender');
    handlers.onSurrender?.();
  });

  return () => {
    for (const off of cleanups) off();
  };
}
