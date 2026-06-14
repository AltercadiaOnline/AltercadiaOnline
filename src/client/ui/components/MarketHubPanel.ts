import { getActionDispatcher } from '../../ActionDispatcher.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { getPlayerMarketStore, type PlayerMarketListing } from '../market/playerMarketStore.js';
import { alertSystem } from '../alertSystem.js';
import { windowManager } from '../WindowManager.js';
import { BaseUIComponent } from '../UIComponent.js';
import {
  bindDelegatedItemIconFallback,
  renderItemIconHtml,
} from '../items/itemIconDisplay.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Painel pessoal de vendas do jogador (Hub Social -> Mercado). */
export class MarketHubPanel extends BaseUIComponent {
  private readonly dispatcher = getActionDispatcher();
  private listings: readonly PlayerMarketListing[] = getPlayerMarketStore().getListings();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super({ id: 'marketHub', rootClassName: 'ui-panel ui-panel--market-hub ui-panel--movable' });
  }

  protected override onOpen(): void {
    this.unsubscribe = getPlayerMarketStore().subscribe((listings) => {
      this.listings = listings;
      if (this.isOpen()) this.render();
    });
  }

  protected override onClose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  createTemplate(): string {
    const rows = this.listings.length > 0
      ? this.listings.map((entry) => this.renderListingRow(entry)).join('')
      : '<li class="market-hub__empty">Nenhum anúncio criado ainda. Use o Monitor do Mercado para listar itens.</li>';

    return `
      <header class="ui-panel__header market-hub__header" data-panel-drag-handle>
        <div>
          <span class="market-hub__tag">MERCADO // PAINEL PESSOAL</span>
          <h2 class="ui-panel__title market-hub__title">Mercado</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar mercado">×</button>
      </header>
      <div class="ui-panel__body market-hub__body">
        <p class="market-hub__hint">Acompanhe seus itens listados e colete VOLTS quando uma venda for concluída.</p>
        <ul class="market-hub__list" aria-label="Seus anúncios">
          ${rows}
        </ul>
      </div>
    `;
  }

  private renderListingRow(entry: PlayerMarketListing): string {
    const status = entry.status === 'LISTED' ? 'À Venda' : 'Vendido';
    const statusClass = entry.status === 'LISTED' ? 'is-listed' : 'is-sold';
    const action = entry.status === 'SOLD'
      ? `<button type="button" class="market-hub__collect" data-action="collect" data-listing-id="${entry.id}">Coletar Volts</button>`
      : '<span class="market-hub__waiting">Aguardando comprador</span>';

    return `
      <li class="market-hub__row">
        <div class="market-hub__col market-hub__col--item">
          <div class="market-hub__item-name">
            ${renderItemIconHtml(entry.itemId, { className: 'market-hub__item-icon' })}
            <span class="market-hub__item-label">${escapeHtml(entry.itemName)}</span>
          </div>
          <span class="market-hub__item-qty">x${entry.quantity}</span>
        </div>
        <div class="market-hub__col market-hub__col--status">
          <span class="market-hub__status ${statusClass}">${status}</span>
        </div>
        <div class="market-hub__col market-hub__col--price">
          <strong>${formatVolts(entry.totalPriceVolts)}</strong>
        </div>
        <div class="market-hub__col market-hub__col--action">
          ${action}
        </div>
      </li>
    `;
  }

  protected override bindEvents(): void {
    bindDelegatedItemIconFallback(this.root);

    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        windowManager.close('marketHub');
        return;
      }

      if (target.dataset.action === 'collect' && target.dataset.listingId) {
        const result = this.dispatcher.dispatch({
          type: 'COLLECT_MARKET_VOLTS',
          payload: { listingId: target.dataset.listingId },
        });
        if (!result.ok) {
          alertSystem(result.reason);
        }
      }
    });
  }
}
