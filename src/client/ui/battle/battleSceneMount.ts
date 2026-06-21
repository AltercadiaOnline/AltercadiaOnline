/** Cena de combate visível — overlays pós-batalha ficam sobre a arena. */
import {
  getPostBattleHudBridge,
  isReactPostBattleHudEnabled,
} from '../../app/bridge/postBattleHudBridge.js';

export function resolveBattleSceneMount(mountRoot?: ParentNode): HTMLElement {
  if (mountRoot instanceof HTMLElement) return mountRoot;
  return ensureBattleHubMountTarget();
}

function forceElementVisible(el: HTMLElement): void {
  el.classList.remove('hidden');
  el.removeAttribute('hidden');
  el.setAttribute('aria-hidden', 'false');
  if (el.style.display === 'none') {
    el.style.removeProperty('display');
  }
}

/** Overlay fixo na viewport — sempre `document.body`. */
export function ensurePostBattleOverlayMount(): HTMLElement {
  console.log('DEBUG: Evento recebido em BattleSceneMount (ensurePostBattleOverlayMount)');
  forceGameContainerVisible();
  if (typeof document === 'undefined') {
    throw new Error('document indisponível');
  }
  return document.body;
}

function forceGameContainerVisible(): void {
  const game = document.querySelector<HTMLElement>('#game-container');
  if (game) forceElementVisible(game);

  const combat = document.querySelector<HTMLElement>('#scene-combat');
  if (combat) forceElementVisible(combat);
}

/**
 * Garante containers visíveis antes de montar o hub.
 * Ignora fila de animação — só DOM.
 */
export function ensureBattleHubMountTarget(): HTMLElement {
  console.log('DEBUG: Evento recebido em BattleSceneMount (ensureBattleHubMountTarget)');
  forceGameContainerVisible();

  const combat = document.querySelector<HTMLElement>('#scene-combat');
  if (combat) return combat;

  const game = document.querySelector<HTMLElement>('#game-container');
  if (game) return game;
  return document.body;
}

export const BATTLE_RESULT_HUB_SELECTOR = '.post-battle-hub';

/** Hub montado e interativo (botão Sair presente). */
export function isPostBattleHubInteractive(): boolean {
  if (typeof document === 'undefined') return false;
  if (isReactPostBattleHudEnabled()) {
    return getPostBattleHudBridge().snapshot().active;
  }
  return Boolean(document.querySelector<HTMLElement>('.post-battle-hub__exit'));
}

/** Hub visível ao jogador. */
export function isBattleResultHubVisible(): boolean {
  if (typeof document === 'undefined') return false;
  if (isPostBattleHubInteractive()) return true;
  const hubs = document.querySelectorAll<HTMLElement>(BATTLE_RESULT_HUB_SELECTOR);
  for (const hub of hubs) {
    if (!hub.classList.contains('hidden')) return true;
  }
  return false;
}
