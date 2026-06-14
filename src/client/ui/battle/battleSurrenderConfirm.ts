import {
  BATTLE_SURRENDER_VOLT_PENALTY,
} from '../../../shared/combat/battleSurrenderConstants.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';

let activeOverlay: HTMLElement | null = null;
let keyListener: ((event: KeyboardEvent) => void) | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Confirmação de fuga/rendição — overlay dentro de #scene-combat (não usa alert do navegador).
 */
export function showBattleSurrenderConfirm(onConfirm: () => void): void {
  dismissBattleSurrenderConfirm();

  const host = document.querySelector<HTMLElement>('#scene-combat');
  if (!host) {
    onConfirm();
    return;
  }

  const penaltyLabel = formatVolts(BATTLE_SURRENDER_VOLT_PENALTY);
  const overlay = document.createElement('div');
  overlay.className = 'battle-surrender-confirm';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'battle-surrender-confirm-title');
  overlay.innerHTML = `
    <div class="battle-surrender-confirm__backdrop" data-action="cancel-surrender" aria-hidden="true"></div>
    <div class="battle-surrender-confirm__card">
      <span class="battle-surrender-confirm__tag">COMBATE // FUGA</span>
      <h3 class="battle-surrender-confirm__title" id="battle-surrender-confirm-title">Fugir da batalha?</h3>
      <p class="battle-surrender-confirm__text">
        Penalidade: <strong>−${escapeHtml(penaltyLabel)}</strong>.
        O monstro permanece vivo no mapa.
      </p>
      <p class="battle-surrender-confirm__hint">Você perde a luta e volta ao mundo.</p>
      <div class="battle-surrender-confirm__actions">
        <button type="button" class="battle-surrender-confirm__btn battle-surrender-confirm__btn--confirm" data-action="confirm-surrender">
          Confirmar fuga
        </button>
        <button type="button" class="battle-surrender-confirm__btn battle-surrender-confirm__btn--cancel" data-action="cancel-surrender">
          Continuar lutando
        </button>
      </div>
    </div>
  `;

  const confirm = (): void => {
    dismissBattleSurrenderConfirm();
    onConfirm();
  };
  const cancel = (): void => dismissBattleSurrenderConfirm();

  overlay.querySelector('[data-action="confirm-surrender"]')?.addEventListener('click', confirm);
  overlay.querySelectorAll('[data-action="cancel-surrender"]').forEach((node) => {
    node.addEventListener('click', cancel);
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  };
  keyListener = onKeyDown;
  document.addEventListener('keydown', onKeyDown);

  host.appendChild(overlay);
  activeOverlay = overlay;

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  } else {
    overlay.classList.add('is-visible');
  }

  overlay.querySelector<HTMLButtonElement>('.battle-surrender-confirm__btn--cancel')?.focus();
}

export function dismissBattleSurrenderConfirm(): void {
  if (keyListener) {
    document.removeEventListener('keydown', keyListener);
    keyListener = null;
  }
  activeOverlay?.remove();
  activeOverlay = null;
}
