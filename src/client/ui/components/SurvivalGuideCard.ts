import {
  CAEL_SURVIVAL_GUIDE_TITLE,
  type CaelSurvivalLesson,
} from '../../../shared/world/caelSurvivalGuideBook.js';
import { CLIENT_ROOT_IDS } from '../../app/shell/uiLayers.js';

let activeCard: SurvivalGuideCard | null = null;

/**
 * Modal estético (estilo Diário) — 1 lição do dia do shard.
 */
export class SurvivalGuideCard {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;

  constructor(
    private readonly host: HTMLElement,
    private readonly lesson: CaelSurvivalLesson,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'survival-guide-card ui-interactive';
    this.root.setAttribute('role', 'presentation');

    const backdrop = document.createElement('div');
    backdrop.className = 'survival-guide-card__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    this.panel = document.createElement('div');
    this.panel.className = 'survival-guide-card__panel ui-panel ui-panel--diary';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-label', CAEL_SURVIVAL_GUIDE_TITLE);
    this.panel.innerHTML = renderSurvivalGuideCardHtml(lesson);

    this.root.append(backdrop, this.panel);

    backdrop.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });
    backdrop.addEventListener('click', (event) => {
      event.stopPropagation();
      this.destroy();
    });

    this.panel.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    this.panel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-action="close"]')) {
        event.stopPropagation();
        this.destroy();
      }
    });
  }

  open(): void {
    this.host.append(this.root);
    window.setTimeout(() => {
      this.panel.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus();
    }, 0);
  }

  destroy(): void {
    this.root.remove();
    if (activeCard === this) {
      activeCard = null;
    }
  }
}

function resolveSurvivalGuideMountHost(): HTMLElement {
  return (
    document.getElementById(CLIENT_ROOT_IDS.overlayRoot)
    ?? document.getElementById(CLIENT_ROOT_IDS.hudRoot)
    ?? document.body
  );
}

function renderSurvivalGuideCardHtml(lesson: CaelSurvivalLesson): string {
  const bodyHtml = lesson.body.split('\n\n').map((paragraph) => (
    `<p class="diary-book__entry-content">${escapeHtml(paragraph)}</p>`
  )).join('');

  return `
    <header class="ui-panel__header diary-panel__header">
      <div class="diary-panel__header-main">
        <span class="diary-panel__tag">ANCIÃO CAEL // SUPORTE</span>
        <h2 class="ui-panel__title diary-panel__title">${escapeHtml(CAEL_SURVIVAL_GUIDE_TITLE)}</h2>
      </div>
    </header>
    <div class="ui-panel__body diary-panel__body">
      <div class="diary-panel__scroll">
        <div class="diary-book__header">
          <span class="diary-book__tag">LIÇÃO DO CICLO</span>
          <p class="diary-book__subtitle">Uma tip por ciclo do mundo. Todos leem a mesma.</p>
        </div>
        <div class="diary-book__feed survival-guide-card__feed">
          <article class="diary-book__entry survival-guide-card__entry survival-guide-card__entry--new">
            <div class="diary-book__entry-head">
              <span class="diary-book__entry-icon" aria-hidden="true">${lesson.order}</span>
              <div class="diary-book__entry-meta">
                <span class="diary-book__entry-tag">LIÇÃO ${lesson.order}</span>
                <strong class="survival-guide-card__entry-title">${escapeHtml(lesson.title)}</strong>
              </div>
            </div>
            ${bodyHtml}
          </article>
        </div>
      </div>
    </div>
    <footer class="survival-guide-card__footer">
      <button type="button" class="survival-guide-card__fechar ui-interactive" data-action="close">
        Fechar
      </button>
    </footer>
  `;
}

export function openSurvivalGuideCard(lesson: CaelSurvivalLesson): void {
  closeSurvivalGuideCard();
  activeCard = new SurvivalGuideCard(resolveSurvivalGuideMountHost(), lesson);
  activeCard.open();
}

export function closeSurvivalGuideCard(): void {
  activeCard?.destroy();
  activeCard = null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
