import { BaseUIComponent } from '../UIComponent.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

/** Modal centralizado — confirmação antes de atravessar um portal. */
export class PortalModal extends BaseUIComponent {
  private zoneName = '';
  private portalId: string | null = null;
  private offShow: (() => void) | null = null;
  private offHide: (() => void) | null = null;

  constructor() {
    super({
      id: 'portal-confirm',
      rootClassName: 'ui-panel ui-panel--modal portal-modal',
      movable: false,
    });
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    this.offShow = uiEvents.on(UIEventType.SHOW_PORTAL_CONFIRMATION, (payload) => {
      this.zoneName = payload.zoneName;
      this.portalId = payload.portalId;
      this.render();
      this.open();
    });
    this.offHide = uiEvents.on(UIEventType.HIDE_PORTAL_CONFIRMATION, () => {
      this.close();
      this.portalId = null;
    });
  }

  createTemplate(): string {
    const label = escapeHtml(this.zoneName || 'esta zona');
    return `
      <div class="portal-modal__content">
        <h2 class="portal-modal__title">Portal</h2>
        <p class="portal-modal__question">Deseja entrar em <strong>${label}</strong>?</p>
        <div class="portal-modal__actions">
          <button type="button" class="portal-modal__btn portal-modal__btn--yes" data-action="accept">Sim</button>
          <button type="button" class="portal-modal__btn portal-modal__btn--no" data-action="decline">Não</button>
        </div>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'accept' && this.portalId) {
        uiEvents.emit(UIEventType.PORTAL_CONFIRM_ACCEPT, { portalId: this.portalId });
        return;
      }

      if (target.dataset.action === 'decline') {
        uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});
      }
    });
  }

  override destroy(): void {
    this.offShow?.();
    this.offHide?.();
    this.offShow = null;
    this.offHide = null;
    super.destroy();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let activeModal: PortalModal | null = null;

export function initPortalModal(parent: HTMLElement): PortalModal {
  if (activeModal) return activeModal;
  activeModal = new PortalModal();
  activeModal.mount(parent);
  return activeModal;
}

export function destroyPortalModal(): void {
  activeModal?.destroy();
  activeModal = null;
}

export function getPortalModal(): PortalModal | null {
  return activeModal;
}
