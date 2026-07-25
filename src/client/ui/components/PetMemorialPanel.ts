// @ts-nocheck
import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
import { getPetMemorialStore } from '../pet/petMemorialStore.js';
import { renderMemorialBook } from '../pet/memorialBookView.js';
/** Livro de Memórias — pets falecidos em estilo sépia. */
export class PetMemorialPanel extends BaseUIComponent {
    snapshot = getPetMemorialStore().getSnapshot();
    unsub = null;
    constructor() {
        super({
            id: 'petMemorial',
            rootClassName: 'ui-panel ui-panel--pet-memorial ui-panel--movable',
        });
    }
    shouldUseDynamicLayout() {
        return true;
    }
    getDynamicLayoutOptions() {
        return {
            fitRootSelector: '.memorial-book-panel__scroll',
            secondarySelector: '[data-hud-fit-secondary]',
        };
    }
    onOpen() {
        this.snapshot = getPetMemorialStore().getSnapshot();
        this.unsub = getPetMemorialStore().subscribe((next) => {
            this.snapshot = next;
            if (this.isOpen())
                this.render();
        });
    }
    onClose() {
        this.unsub?.();
        this.unsub = null;
    }
    createTemplate() {
        return `
      <header class="ui-panel__header memorial-book-panel__header" data-panel-drag-handle>
        <div class="memorial-book-panel__header-main">
          <span class="memorial-book-panel__tag">SISTEMA DE MEMÓRIAS</span>
          <h2 class="ui-panel__title">Livro de Memórias</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Livro de Memórias">×</button>
      </header>
      <div class="ui-panel__body memorial-book-panel__body">
        <div class="memorial-book-panel__scroll">
          ${renderMemorialBook(this.snapshot)}
        </div>
      </div>
    `;
    }
    bindEvents() {
        this.root?.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            windowManager.close('petMemorial');
        });
    }
}
