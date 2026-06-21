import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';
import { clearLootCasinoSessionHandlers } from '../../app/battle/lootCasinoSessionHandlers.js';
import {
  getLootCasinoHudBridge,
  isReactLootCasinoEnabled,
} from '../../app/bridge/lootCasinoHudBridge.js';
import {
  createLootCasinoController,
  type LootCasinoController,
  type LootCasinoPhase,
} from './LootCasinoController.js';
import { resolveLootCasinoHintForPhase } from './lootCasinoView.js';

export type LootCasinoScreenOptions = {
  readonly slots: readonly LootRevealSlot[];
  readonly mountRoot?: ParentNode;
  /** Retorne false para manter a HUD aberta e permitir nova tentativa de coleta. */
  readonly onConfirm?: () => boolean | void | Promise<boolean | void>;
  /** Sair sem coletar — descarta pending loot no servidor. */
  readonly onDismiss?: () => void;
  /** Animação terminou — libera Sair na HUD por baixo. */
  readonly onSpinSettled?: () => void;
};

export type LootCasinoOverlayHandle = {
  readonly destroy: () => void;
};

let activeCasinoOverlay: HTMLElement | null = null;
let activeCasinoController: LootCasinoController | null = null;
let activeErrorOverlay: HTMLElement | null = null;
let activeLoadingOverlay: HTMLElement | null = null;
let activeCasinoIsSpinning = false;

/** True enquanto a animação de slots bloqueia saída/fechar (HUD + cassino). */
export function isLootCasinoSpinning(): boolean {
  if (isReactLootCasinoEnabled()) {
    return getLootCasinoHudBridge().snapshot().spinning;
  }
  return activeCasinoIsSpinning;
}

function setCasinoSpinning(active: boolean): void {
  activeCasinoIsSpinning = active;
}

function resolveMountRoot(_mountRoot?: ParentNode): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('DOM indisponível');
  }
  return document.body;
}

/** Acima do PostBattleHub (999999) — cassino fica visível ao clicar Recompensas. */
function applyLootCasinoOverlayForceStyles(overlay: HTMLElement): void {
  overlay.classList.add('loot-casino-screen--force-viewport');
  const forced: Record<string, string> = {
    position: 'fixed',
    inset: '0',
    'z-index': '1000002',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'pointer-events': 'auto',
    visibility: 'visible',
    opacity: '1',
  };
  for (const [prop, value] of Object.entries(forced)) {
    overlay.style.setProperty(prop, value, 'important');
  }
}

/** Libera spin, overlays de cassino/erro/loading e referências DOM. */
export function destroyActiveLootCasino(): void {
  if (isReactLootCasinoEnabled()) {
    getLootCasinoHudBridge().dismiss();
    clearLootCasinoSessionHandlers();
    return;
  }
  setCasinoSpinning(false);
  activeCasinoController?.destroy();
  activeCasinoController = null;
  activeCasinoOverlay?.remove();
  activeCasinoOverlay = null;
  activeErrorOverlay?.remove();
  activeErrorOverlay = null;
  activeLoadingOverlay?.remove();
  activeLoadingOverlay = null;
}

export function showLootCasinoLoadingOverlay(mountRoot?: ParentNode): LootCasinoOverlayHandle {
  destroyActiveLootCasino();
  const mountTarget = resolveMountRoot(mountRoot);
  const doc = mountTarget.ownerDocument ?? document;

  const overlay = doc.createElement('div');
  overlay.className = 'victory-screen-overlay victory-screen-overlay--casino loot-casino-screen loot-casino-screen--loading';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Carregando recompensas');

  const panel = doc.createElement('div');
  panel.className = 'victory-screen victory-screen--casino';

  const title = doc.createElement('h2');
  title.className = 'victory-screen__title victory-screen__title--win';
  title.textContent = 'Recompensas';

  const hint = doc.createElement('p');
  hint.className = 'victory-screen__loot-hint';
  hint.textContent = 'Buscando pacote de loot no servidor…';

  panel.append(title, hint);
  overlay.appendChild(panel);
  applyLootCasinoOverlayForceStyles(overlay);
  mountTarget.appendChild(overlay);
  activeLoadingOverlay = overlay;

  return {
    destroy: () => {
      overlay.remove();
      if (activeLoadingOverlay === overlay) activeLoadingOverlay = null;
    },
  };
}

export type LootCasinoErrorOverlayOptions = {
  readonly message: string;
  readonly onRetry: () => void;
};

/** Erro isolado — PostBattleHub permanece funcional por baixo. */
export function showLootCasinoErrorOverlay(
  mountRoot: ParentNode,
  options: LootCasinoErrorOverlayOptions,
): LootCasinoOverlayHandle {
  activeErrorOverlay?.remove();
  activeErrorOverlay = null;

  const mountTarget = resolveMountRoot(mountRoot);
  const doc = mountTarget.ownerDocument ?? document;

  const overlay = doc.createElement('div');
  overlay.className = 'victory-screen-overlay victory-screen-overlay--casino loot-casino-screen loot-casino-screen--error';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Erro ao carregar recompensas');

  const panel = doc.createElement('div');
  panel.className = 'victory-screen victory-screen--casino';

  const title = doc.createElement('h2');
  title.className = 'victory-screen__title';
  title.textContent = 'Recompensas indisponíveis';

  const hint = doc.createElement('p');
  hint.className = 'victory-screen__loot-hint';
  hint.textContent = options.message;

  const actions = doc.createElement('div');
  actions.className = 'battle-decision-actions';

  const retryBtn = doc.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'victory-screen__reveal';
  retryBtn.textContent = 'Tentar Novamente';

  const closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'victory-screen__close';
  closeBtn.textContent = 'Fechar';

  retryBtn.addEventListener('click', () => {
    overlay.remove();
    if (activeErrorOverlay === overlay) activeErrorOverlay = null;
    options.onRetry();
  });

  closeBtn.addEventListener('click', () => {
    overlay.remove();
    if (activeErrorOverlay === overlay) activeErrorOverlay = null;
  });

  actions.append(retryBtn, closeBtn);
  panel.append(title, hint, actions);
  overlay.appendChild(panel);
  applyLootCasinoOverlayForceStyles(overlay);
  mountTarget.appendChild(overlay);
  activeErrorOverlay = overlay;
  retryBtn.focus();

  return {
    destroy: () => {
      overlay.remove();
      if (activeErrorOverlay === overlay) activeErrorOverlay = null;
    },
  };
}

function createLootCasinoLever(doc: Document): {
  readonly root: HTMLElement;
  readonly handle: HTMLButtonElement;
  readonly playPullAnimation: () => Promise<void>;
} {
  const LEVER_ANIM_MS = 350;

  const root = doc.createElement('div');
  root.className = 'loot-casino-lever';

  const track = doc.createElement('div');
  track.className = 'loot-casino-lever__track';

  const handle = doc.createElement('button');
  handle.type = 'button';
  handle.className = 'loot-casino-lever__handle';
  handle.setAttribute('aria-label', 'Puxar alavanca do cassino');

  const knob = doc.createElement('span');
  knob.className = 'loot-casino-lever__knob';
  knob.setAttribute('aria-hidden', 'true');

  const arm = doc.createElement('span');
  arm.className = 'loot-casino-lever__arm';
  arm.setAttribute('aria-hidden', 'true');

  const label = doc.createElement('span');
  label.className = 'loot-casino-lever__label';
  label.textContent = 'Puxar alavanca';

  handle.append(knob, arm, label);
  track.appendChild(handle);
  root.appendChild(track);

  const waitHandleTransition = (): Promise<void> =>
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      handle.addEventListener('transitionend', (event) => {
        if (event.propertyName === 'transform') finish();
      }, { once: true });

      window.setTimeout(finish, LEVER_ANIM_MS + 60);
    });

  const playPullAnimation = async (): Promise<void> => {
    if (handle.disabled) return;

    handle.disabled = true;

    // Ida: puxa a alavanca para baixo.
    root.classList.add('loot-casino-lever--pulled');
    await waitHandleTransition();

    // Volta: solta e retorna à posição de repouso antes dos slots girarem.
    root.classList.remove('loot-casino-lever--pulled');
    root.classList.add('loot-casino-lever--releasing');
    await waitHandleTransition();
    root.classList.remove('loot-casino-lever--releasing');
  };

  return { root, handle, playPullAnimation };
}

function resolveHintForPhase(phase: LootCasinoPhase, slots: readonly LootRevealSlot[]): string {
  return resolveLootCasinoHintForPhase(phase, slots);
}

function setActionButtonsLocked(
  collectBtn: HTMLButtonElement,
  exitBtn: HTMLButtonElement,
  locked: boolean,
): void {
  collectBtn.disabled = locked;
  exitBtn.disabled = locked;
  if (locked) {
    exitBtn.setAttribute('aria-disabled', 'true');
  } else {
    exitBtn.removeAttribute('aria-disabled');
  }
}

/**
 * HUD de cassino PVE — alavanca → giro dos slots → Coletar ou Sair sem coletar.
 */
export function showLootCasinoScreen(options: LootCasinoScreenOptions): Promise<void> {
  destroyActiveLootCasino();
  const mountTarget = resolveMountRoot(options.mountRoot);

  return new Promise((resolve) => {
    const doc = mountTarget.ownerDocument ?? document;
    const overlay = doc.createElement('div');
    overlay.className = 'victory-screen-overlay victory-screen-overlay--casino loot-casino-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Recompensas da batalha');

    const panel = doc.createElement('div');
    panel.className = 'victory-screen victory-screen--casino';

    const title = doc.createElement('h2');
    title.className = 'victory-screen__title victory-screen__title--win';
    title.textContent = 'Cassino de loot';

    const hint = doc.createElement('p');
    hint.className = 'victory-screen__loot-hint';
    hint.textContent = resolveHintForPhase('idle', options.slots);

    const blockedHint = doc.createElement('p');
    blockedHint.className = 'victory-screen__loot-hint victory-screen__loot-hint--blocked';
    blockedHint.hidden = true;
    blockedHint.textContent = 'Esperando animação…';

    const spinHost = doc.createElement('div');
    spinHost.className = 'victory-screen__spin-host';

    const lever = createLootCasinoLever(doc);

    const actions = doc.createElement('div');
    actions.className = 'battle-decision-actions loot-casino-screen__actions';

    const exitBtn = doc.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'victory-screen__close loot-casino-screen__exit';
    exitBtn.textContent = 'Sair sem coletar';

    const collectBtn = doc.createElement('button');
    collectBtn.type = 'button';
    collectBtn.className = 'victory-screen__reveal loot-casino-screen__collect';
    collectBtn.textContent = 'Coletar';
    collectBtn.hidden = true;
    collectBtn.disabled = true;

    let lootController: LootCasinoController | null = null;
    let settled = false;
    let isAnimating = false;

    let blockedHintTimer: ReturnType<typeof setTimeout> | null = null;

    const syncAnimatingFlag = (active: boolean): void => {
      isAnimating = active;
      setCasinoSpinning(active);
      actions.classList.toggle('loot-casino-screen__actions--locked', active);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      if (blockedHintTimer !== null) {
        clearTimeout(blockedHintTimer);
        blockedHintTimer = null;
      }
      syncAnimatingFlag(false);
      lootController?.destroy();
      if (activeCasinoController === lootController) activeCasinoController = null;
      lootController = null;
      overlay.remove();
      if (activeCasinoOverlay === overlay) activeCasinoOverlay = null;
      resolve();
    };

    const showBlockedFeedback = () => {
      blockedHint.hidden = false;
      if (blockedHintTimer !== null) clearTimeout(blockedHintTimer);
      blockedHintTimer = setTimeout(() => {
        blockedHint.hidden = true;
        blockedHintTimer = null;
      }, 2200);
    };

    const settleSpin = () => {
      syncAnimatingFlag(false);
      hint.textContent = resolveHintForPhase('ready', options.slots);
      collectBtn.hidden = false;
      setActionButtonsLocked(collectBtn, exitBtn, false);
      options.onSpinSettled?.();
      collectBtn.focus();
    };

    const dismissWithoutCollect = () => {
      if (settled) return;
      if (isAnimating) {
        showBlockedFeedback();
        return;
      }
      options.onDismiss?.();
      finish();
    };

    const confirmLoot = () => {
      if (settled) return;
      if (isAnimating) {
        showBlockedFeedback();
        return;
      }
      collectBtn.disabled = true;
      collectBtn.textContent = 'Coletando…';
      void Promise.resolve(options.onConfirm?.())
        .then((result) => {
          if (result === false) {
            collectBtn.disabled = false;
            collectBtn.textContent = 'Coletar';
            return;
          }
          finish();
        })
        .catch((error) => {
          console.error('[LootCasino] Coleta falhou:', error);
          collectBtn.disabled = false;
          collectBtn.textContent = 'Coletar';
        });
    };

    collectBtn.addEventListener('click', confirmLoot);
    exitBtn.addEventListener('click', dismissWithoutCollect);

    overlay.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (isAnimating) {
        showBlockedFeedback();
        return;
      }
      dismissWithoutCollect();
    });

    actions.append(exitBtn, collectBtn);
    panel.append(title, hint, blockedHint, spinHost, lever.root, actions);
    overlay.appendChild(panel);
    applyLootCasinoOverlayForceStyles(overlay);
    mountTarget.appendChild(overlay);
    activeCasinoOverlay = overlay;

    lootController = createLootCasinoController({
      slots: options.slots,
      spinHost,
      pullLever: lever.playPullAnimation,
      onPhaseChange: (phase) => {
        hint.textContent = resolveHintForPhase(phase, options.slots);
        const animating = phase === 'lever_pull' || phase === 'spinning';
        syncAnimatingFlag(animating);
        if (animating) {
          setActionButtonsLocked(collectBtn, exitBtn, true);
        }
      },
      onReady: settleSpin,
    });
    activeCasinoController = lootController;

    lever.handle.addEventListener('click', () => {
      if (settled || lootController?.getPhase() !== 'idle') return;
      setActionButtonsLocked(collectBtn, exitBtn, true);
      void lootController.runLootSequence().catch((error) => {
        console.error('[LootCasino] Sequência falhou:', error);
        syncAnimatingFlag(false);
        setActionButtonsLocked(collectBtn, exitBtn, false);
        lever.handle.disabled = false;
        lever.root.classList.remove('loot-casino-lever--pulled', 'loot-casino-lever--releasing');
        const leverLabel = lever.root.querySelector('.loot-casino-lever__label');
        if (leverLabel) leverLabel.textContent = 'Puxar alavanca';
        hint.textContent = resolveHintForPhase('idle', options.slots);
      });
    });

    lever.handle.focus();
  });
}
