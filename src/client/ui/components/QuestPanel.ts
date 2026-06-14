import { BaseUIComponent } from '../UIComponent.js';

/** Painel de missões — aberto pelo Mercenário. */
export class QuestPanel extends BaseUIComponent {
  constructor() {
    super({ id: 'quest', rootClassName: 'ui-panel ui-panel--quest ui-panel--movable' });
  }

  createTemplate(): string {
    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <h2 class="ui-panel__title">Quests</h2>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Quests">×</button>
      </header>
      <div class="ui-panel__body">
        <p class="ui-empty">Quadro de contratos em breve.</p>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.action === 'close') {
        this.close();
      }
    });
  }
}
