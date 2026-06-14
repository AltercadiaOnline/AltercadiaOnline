import { BaseUIComponent } from '../UIComponent.js';

import type { UiWindowId } from '../uiEvents.js';

import { HUD_WINDOW_SHORTCUT_LABEL } from '../keyboardShortcuts.js';

import { windowManager } from '../WindowManager.js';



const HUB_ACTIONS: ReadonlyArray<{ readonly windowId: UiWindowId; readonly label: string; readonly accent?: boolean }> = [

  { windowId: 'characters', label: 'Personagem' },

  { windowId: 'shop', label: 'Loja de Skins', accent: true },

  { windowId: 'moveset', label: 'Moveset' },

  { windowId: 'marcos', label: 'Habilidade Marcos' },

  { windowId: 'quest', label: 'Quests' },

  { windowId: 'inventory', label: 'Inventário' },

  { windowId: 'marketHub', label: 'Mercado' },

  { windowId: 'social', label: 'Social' },

  { windowId: 'petLove', label: 'Pet Love' },

];



/**

 * Hub Central — menu em grid; cada botão abre uma janela HUD móvel (o Hub permanece aberto).

 */

export class CentralHubPanel extends BaseUIComponent {

  constructor() {

    super({

      id: 'hub',

      rootClassName: 'ui-panel ui-panel--hub ui-panel--hub-bar',

      movable: false,

    });

  }



  createTemplate(): string {

    const buttons = HUB_ACTIONS.map((action) => {

      const shortcut = HUD_WINDOW_SHORTCUT_LABEL[action.windowId];

      const shortcutMarkup = shortcut

        ? `<span class="ui-hub-bar__btn-key" aria-hidden="true"> [${shortcut}]</span>`

        : '';

      const ariaShortcut = shortcut ? ` (atalho ${shortcut})` : '';

      return `

        <button

          type="button"

          class="ui-hub-bar__btn${action.accent ? ' ui-hub-bar__btn--accent' : ''}"

          data-open-window="${action.windowId}"

          aria-label="${action.label}${ariaShortcut}"

        ><span class="ui-hub-bar__btn-label">${action.label}</span>${shortcutMarkup}</button>

      `;

    }).join('');



    return `
      <div class="ui-panel__body hub-shell hub-shell--bar-only">
        <footer class="ui-hub-bar" data-hub-main-view aria-label="Hub Central">
          <div class="ui-hub-bar__toolbar">
            <span class="ui-hub-bar__title">HUB SOCIAL</span>
            <button type="button" class="ui-hub-bar__close" data-action="close" aria-label="Fechar Hub">×</button>
          </div>
          <nav class="ui-hub-bar__grid" aria-label="Menu rápido">
            ${buttons}
          </nav>
        </footer>
      </div>
    `;

  }



  protected override bindEvents(): void {

    this.root?.addEventListener('click', (event) => {

      const target = event.target;

      if (!(target instanceof HTMLElement)) return;



      if (target.dataset.action === 'close') {

        this.close();

        return;

      }



      const hubBtn = target.closest<HTMLElement>('[data-open-window]');

      const windowId = hubBtn?.dataset.openWindow as UiWindowId | undefined;

      if (windowId) {

        windowManager.open(windowId);

      }

    });

  }

}

