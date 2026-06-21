import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { renderItemIconHtml } from '../../../../ui/items/itemIconDisplay.js';
import { useMarketHubPanelState } from '../../../panels/useMarketHubPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldMarketHubPanelProps = {
  zIndex: number;
  focused: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function WorldMarketHubPanel({ zIndex, focused }: WorldMarketHubPanelProps) {
  const listings = useMarketHubPanelState();
  const dispatcher = getActionDispatcher();

  return (
    <MovablePanelFrame
      windowId="marketHub"
      title="Mercado"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--market-hub"
      panelStyle={{ width: 'min(480px, 94vw)', maxHeight: 'min(520px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('marketHub')}
      onClose={() => tryCloseReactWorldPanel('marketHub')}
    >
      <div className="market-hub__body flex flex-col gap-3">
        <p className="market-hub__hint text-[11px] text-white/55">
          Acompanhe seus itens listados e colete VOLTS quando uma venda for concluída.
        </p>
        <ul className="market-hub__list m-0 list-none space-y-2 p-0" aria-label="Seus anúncios">
          {listings.length === 0 ? (
            <li className="market-hub__empty text-[12px] text-white/60">
              Nenhum anúncio criado ainda. Use o Monitor do Mercado para listar itens.
            </li>
          ) : (
            listings.map((entry) => {
              const status = entry.status === 'LISTED' ? 'À Venda' : 'Vendido';
              const statusClass = entry.status === 'LISTED' ? 'is-listed' : 'is-sold';
              return (
                <li key={entry.id} className="market-hub__row grid grid-cols-[1fr_auto_auto] gap-2 rounded border border-white/10 p-2 text-[11px]">
                  <div className="market-hub__col market-hub__col--item">
                    <div
                      className="market-hub__item-name flex items-center gap-2"
                      dangerouslySetInnerHTML={{
                        __html: `${renderItemIconHtml(entry.itemId, { className: 'market-hub__item-icon' })}<span class="market-hub__item-label">${escapeHtml(entry.itemName)}</span>`,
                      }}
                    />
                    <span className="market-hub__item-qty text-white/50">x{entry.quantity}</span>
                  </div>
                  <div className="market-hub__col market-hub__col--status">
                    <span className={`market-hub__status ${statusClass}`}>{status}</span>
                  </div>
                  <div className="market-hub__col market-hub__col--action text-right">
                    <strong>{formatVolts(entry.totalPriceVolts)}</strong>
                    {entry.status === 'SOLD' ? (
                      <button
                        type="button"
                        className="market-hub__collect mt-1 block rounded border border-white/15 px-2 py-0.5 text-[10px] uppercase"
                        onClick={() => {
                          const result = dispatcher.dispatch({
                            type: 'COLLECT_MARKET_VOLTS',
                            payload: { listingId: entry.id },
                          });
                          if (!result.ok) {
                            alertSystem(result.reason);
                          }
                        }}
                      >
                        Coletar Volts
                      </button>
                    ) : (
                      <span className="market-hub__waiting mt-1 block text-white/45">Aguardando comprador</span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </MovablePanelFrame>
  );
}
