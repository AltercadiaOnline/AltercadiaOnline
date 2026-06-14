import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
import type { PlayerDiarySnapshot } from '../../../shared/diary/diaryEntryTypes.js';
import { getPlayerDiaryStore } from '../diary/playerDiaryStore.js';
import { renderDiaryBook } from '../diary/diaryBookView.js';

/** Diário de Memórias — item soulbound aberto pelo inventário. */
export class DiaryPanel extends BaseUIComponent {
  private snapshot: PlayerDiarySnapshot = getPlayerDiaryStore().getSnapshot();
  private unsub: (() => void) | null = null;

  constructor() {
    super({
      id: 'diary',
      rootClassName: 'ui-panel ui-panel--diary ui-panel--movable',
    });
  }

  protected override shouldUseDynamicLayout(): boolean {
    return false;
  }

  protected override onOpen(): void {
    this.snapshot = getPlayerDiaryStore().getSnapshot();
    this.unsub = getPlayerDiaryStore().subscribe(() => {
      this.snapshot = getPlayerDiaryStore().getSnapshot();
      if (this.isOpen()) this.render();
    });
  }

  protected override onClose(): void {
    this.unsub?.();
    this.unsub = null;
  }

  createTemplate(): string {
    return `
      <header class="ui-panel__header diary-panel__header" data-panel-drag-handle>
        <div class="diary-panel__header-main">
          <span class="diary-panel__tag">ITEM // SOULBOUND</span>
          <h2 class="ui-panel__title diary-panel__title">Diário de Memórias</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Diário">×</button>
      </header>
      <div class="ui-panel__body diary-panel__body">
        <div class="diary-panel__scroll">
          ${renderDiaryBook(this.snapshot)}
        </div>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-action="close"]')) {
        windowManager.close('diary');
      }
    });
  }
}

export function openDiaryPanel(): void {
  windowManager.open('diary');
}
