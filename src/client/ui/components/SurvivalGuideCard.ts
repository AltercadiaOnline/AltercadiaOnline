import { CAEL_SURVIVAL_GUIDE_SECTIONS } from '../../../shared/world/caelSurvivalGuideContent.js';

let activeCard: SurvivalGuideCard | null = null;

/**
 * Modal estético (estilo Diário) — sobrepõe o terminal do Cael sem fechá-lo.
 */
export class SurvivalGuideCard {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;

  constructor(private readonly host: HTMLElement) {
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
    this.panel.setAttribute('aria-label', 'Guia de Sobrevivência');
    this.panel.innerHTML = renderSurvivalGuideCardHtml();

    this.root.append(backdrop, this.panel);

    backdrop.addEventListener('mousedown', (event) => {
      event.stopPropagation();
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

function renderSurvivalGuideCardHtml(): string {
  const entries = CAEL_SURVIVAL_GUIDE_SECTIONS.map(
    (tip, index) => `
      <article class="diary-book__entry survival-guide-card__entry">
        <div class="diary-book__entry-head">
          <span class="diary-book__entry-icon" aria-hidden="true">${index + 1}</span>
          <div class="diary-book__entry-meta">
            <span class="diary-book__entry-tag">DICA ${index + 1}</span>
          </div>
        </div>
        <p class="diary-book__entry-content">${escapeHtml(tip)}</p>
      </article>
    `,
  ).join('');

  return `
    <header class="ui-panel__header diary-panel__header">
      <div class="diary-panel__header-main">
        <span class="diary-panel__tag">ANCIÃO CAEL // SUPORTE</span>
        <h2 class="ui-panel__title diary-panel__title">Guia de Sobrevivência</h2>
      </div>
    </header>
    <div class="ui-panel__body diary-panel__body">
      <div class="diary-panel__scroll">
        <div class="diary-book__header">
          <span class="diary-book__tag">EXPEDIÇÕES EM ALTERCADIA</span>
          <p class="diary-book__subtitle">Dicas práticas para sobreviver nas ruas e dimensões.</p>
        </div>
        <div class="diary-book__feed survival-guide-card__feed">
          ${entries}
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

export function openSurvivalGuideCard(): void {
  if (activeCard) return;

  const mountHost =
    document.getElementById('ui-layer')
    ?? document.getElementById('game-stage')
    ?? document.body;

  activeCard = new SurvivalGuideCard(mountHost);
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
