import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';

/** Hub Social — amigos, guilda e chat (Pet Love fica na HUD dedicada). */
export class SocialPanel extends BaseUIComponent {
  constructor() {
    super({
      id: 'social',
      rootClassName: 'ui-panel ui-panel--social ui-panel--movable',
    });
  }

  protected override shouldUseDynamicLayout(): boolean {
    return true;
  }

  protected override getDynamicLayoutOptions() {
    return {
      fitRootSelector: '[data-hud-fit-root]',
      secondarySelector: '[data-hud-fit-secondary]',
    };
  }

  createTemplate(): string {
    return `
      <header class="ui-panel__header social-panel__header" data-panel-drag-handle>
        <div class="social-panel__header-main">
          <span class="social-panel__tag">REDE // SOCIAL</span>
          <h2 class="ui-panel__title">Social</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Social">×</button>
      </header>
      <div class="ui-panel__body social-panel__body" data-hud-fit-root>
        <nav class="social-panel__tabs" aria-label="Seções sociais" data-hud-fit-secondary>
          <button
            type="button"
            class="social-panel__tab social-panel__tab--active"
            aria-pressed="true"
          >Amigos</button>
          <button type="button" class="social-panel__tab" disabled>Guilda</button>
          <button type="button" class="social-panel__tab" disabled>Chat</button>
        </nav>

        <div class="social-panel__segment-host">
          <div class="social-panel__segment social-panel__segment--network">
            <p class="ui-empty social-panel__placeholder">Rede social em breve.</p>
          </div>
        </div>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        windowManager.close('social');
      }
    });
  }
}
