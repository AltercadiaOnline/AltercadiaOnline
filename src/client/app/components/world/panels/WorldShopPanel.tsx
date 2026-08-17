import { AUTH_COMMUNITY_LINKS } from '../../screen/authHudTestFlag.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldShopPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldShopPanel({ zIndex, focused }: WorldShopPanelProps) {
  return (
    <MovablePanelFrame
      windowId="shop"
      title="Loja de Skins"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--shop"
      panelStyle={{ width: 'min(340px, 94vw)', maxHeight: 'min(280px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('shop')}
      onClose={() => tryCloseReactWorldPanel('shop')}
    >
      <div className="shop-hud__body">
        <span className="shop-hud__tag">COSMÉTICO // SKIN</span>
        <p className="shop-hud__headline">Em breve após atualizações.</p>
        <p className="shop-hud__copy">Acompanhem nosso Discord.</p>
        <a
          className="shop-hud__discord"
          href={AUTH_COMMUNITY_LINKS.discord}
          target="_blank"
          rel="noreferrer"
        >
          Discord
        </a>
      </div>
    </MovablePanelFrame>
  );
}
