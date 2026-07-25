// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useMarketHubPanel } from '../../panels/useMarketHubPanel.js';
import { renderItemIconHtml } from '../../../ui/items/itemIconDisplay.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function MarketHubPanelHud({ focused }) {
    const { listings, collectVolts } = useMarketHubPanel(true);
    const header = (<header className="ui-panel__header market-hub__header" data-panel-drag-handle>
      <div>
        <span className="market-hub__tag">MERCADO // PAINEL PESSOAL</span>
        <h2 className="ui-panel__title market-hub__title">Mercado</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar mercado" onClick={() => closeHudWindow('marketHub')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="marketHub" className="ui-panel--market-hub" title="Mercado" focused={focused} customHeader={header} bodyClassName="ui-panel__body market-hub__body">
      <p className="market-hub__hint">
        Acompanhe seus itens listados e colete VOLTS quando uma venda for concluída.
      </p>
      <ul className="market-hub__list" aria-label="Seus anúncios">
        {listings.length === 0 ? (<li className="market-hub__empty">
            Nenhum anúncio criado ainda. Use o Monitor do Mercado para listar itens.
          </li>) : (listings.map((entry) => (<li key={entry.id} className="market-hub__row">
              <div className="market-hub__col market-hub__col--item">
                <div className="market-hub__item-name">
                  <span dangerouslySetInnerHTML={{
                __html: renderItemIconHtml(entry.itemId, { className: 'market-hub__item-icon' }),
            }}/>
                  <span className="market-hub__item-label">{entry.itemName}</span>
                </div>
                <span className="market-hub__item-qty">
                  x
                  {entry.quantity}
                </span>
              </div>
              <div className="market-hub__col market-hub__col--status">
                <span className={[
                'market-hub__status',
                entry.status === 'LISTED' ? 'is-listed' : 'is-sold',
            ].join(' ')}>
                  {entry.statusLabel}
                </span>
              </div>
              <div className="market-hub__col market-hub__col--price">
                <strong>{entry.priceLabel}</strong>
              </div>
              <div className="market-hub__col market-hub__col--action">
                {entry.canCollect ? (<button type="button" className="market-hub__collect" data-action="collect" data-listing-id={entry.id} onClick={() => collectVolts(entry.id)}>
                    Coletar Volts
                  </button>) : (<span className="market-hub__waiting">Aguardando comprador</span>)}
              </div>
            </li>)))}
      </ul>
    </MovablePanelShell>);
}
