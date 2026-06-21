import { SKIN_SLOT_LABELS } from '../../../../../shared/character/playerSkin.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { useShopPanelState } from '../../../panels/useShopPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldShopPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldShopPanel({ zIndex, focused }: WorldShopPanelProps) {
  const { walletFormatted, items } = useShopPanelState();
  const dispatcher = getActionDispatcher();

  return (
    <MovablePanelFrame
      windowId="shop"
      title="Loja de Skins"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--shop"
      panelStyle={{ width: 'min(440px, 94vw)', maxHeight: 'min(520px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('shop')}
      onClose={() => tryCloseReactWorldPanel('shop')}
    >
      <div className="shop-hud__body flex flex-col gap-3">
        <p className="shop-hud__balance text-[12px] text-white/75">
          Saldo: <strong>{walletFormatted}</strong>
        </p>
        <p className="shop-hud__hint text-[11px] text-white/50">
          Peças cosméticas — não alteram stats de batalha.
        </p>
        <div className="shop-hud__grid grid grid-cols-2 gap-2">
          {items.map((item) => (
            <article
              key={`${item.slot}-${item.optionId}`}
              className={`shop-hud__card rounded border border-white/10 p-2 ${item.owned ? 'shop-hud__card--owned opacity-70' : ''}`}
            >
              <div
                className="shop-hud__swatch mb-2 h-8 rounded"
                style={{ background: item.accent }}
              />
              <p className="shop-hud__slot text-[10px] uppercase tracking-wider text-white/45">
                {SKIN_SLOT_LABELS[item.slot]}
              </p>
              <h3 className="shop-hud__name text-[12px] font-semibold text-white/85">{item.name}</h3>
              <p className="shop-hud__price text-[11px] text-alter-accent">{formatVolts(item.price)}</p>
              <button
                type="button"
                className="shop-hud__buy mt-2 w-full rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-50"
                disabled={item.owned}
                onClick={() => {
                  dispatcher.dispatch({
                    type: 'PURCHASE_SKIN',
                    payload: { slot: item.slot, optionId: item.optionId },
                  });
                }}
              >
                {item.owned ? 'Adquirido' : 'Comprar'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </MovablePanelFrame>
  );
}
