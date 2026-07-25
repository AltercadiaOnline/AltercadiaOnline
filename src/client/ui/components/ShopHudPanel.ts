// @ts-nocheck
import { SKIN_SLOT_LABELS } from '../../../shared/character/playerSkin.js';
import { SKIN_SHOP_CATALOG } from '../../../shared/character/skinShopCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerSkinStore } from '../character/playerSkinStore.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
/**
 * Loja de Skins — leitura de carteira via IDataStore; compras via ActionDispatcher.
 */
export class ShopHudPanel extends BaseUIComponent {
    dataStore = getDataStore();
    dispatcher = getActionDispatcher();
    walletFormatted = this.dataStore.getWallet().voltsFormatted;
    unsubscribeWallet = null;
    constructor() {
        super({
            id: 'shop',
            rootClassName: 'ui-panel ui-panel--shop ui-panel--movable',
        });
    }
    onOpen() {
        this.walletFormatted = this.dataStore.getWallet().voltsFormatted;
        this.refreshWallet();
        this.refreshGrid();
        this.unsubscribeWallet = this.dataStore.subscribe('wallet', (wallet) => {
            this.walletFormatted = wallet.voltsFormatted;
            this.refreshWallet();
            this.refreshGrid();
        });
    }
    onClose() {
        this.unsubscribeWallet?.();
        this.unsubscribeWallet = null;
    }
    createTemplate() {
        return `
      <header class="ui-panel__header shop-hud__header" data-panel-drag-handle>
        <div>
          <span class="shop-hud__tag">MERCADO // SKINS</span>
          <h2 class="ui-panel__title">Loja de Skins</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar loja de skins">×</button>
      </header>
      <div class="ui-panel__body shop-hud__body">
        <p class="shop-hud__balance">Saldo: <strong data-shop-wallet>${this.walletFormatted}</strong></p>
        <p class="shop-hud__hint">Peças cosméticas — não alteram stats de batalha.</p>
        <div class="shop-hud__grid" data-shop-grid>
          ${this.renderShopGrid()}
        </div>
      </div>
    `;
    }
    bindEvents() {
        this.root?.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement))
                return;
            if (target.dataset.action === 'close') {
                windowManager.close('shop');
                return;
            }
            const buyBtn = target.closest('[data-buy-skin]');
            if (!buyBtn || buyBtn.disabled)
                return;
            const slot = buyBtn.dataset.skinSlot;
            const optionId = buyBtn.dataset.optionId;
            if (!slot || !optionId)
                return;
            const result = this.dispatcher.dispatch({
                type: 'PURCHASE_SKIN',
                payload: { slot: slot, optionId },
            });
            if (result.ok) {
                this.refreshGrid();
            }
        });
    }
    renderShopGrid() {
        const skinStore = getPlayerSkinStore();
        return SKIN_SHOP_CATALOG.map((item) => {
            const owned = skinStore.isOwned(item.slot, item.optionId);
            return `
        <article class="shop-hud__card${owned ? ' shop-hud__card--owned' : ''}">
          <div class="shop-hud__swatch" style="background:${item.accent}"></div>
          <p class="shop-hud__slot">${SKIN_SLOT_LABELS[item.slot]}</p>
          <h3 class="shop-hud__name">${item.name}</h3>
          <p class="shop-hud__price">${formatVolts(item.price)}</p>
          <button
            type="button"
            class="shop-hud__buy"
            data-buy-skin
            data-skin-slot="${item.slot}"
            data-option-id="${item.optionId}"
            ${owned ? 'disabled' : ''}
          >
            ${owned ? 'Adquirido' : 'Comprar'}
          </button>
        </article>
      `;
        }).join('');
    }
    refreshWallet() {
        const el = this.query('[data-shop-wallet]');
        if (el)
            el.textContent = this.walletFormatted;
    }
    refreshGrid() {
        const grid = this.query('[data-shop-grid]');
        if (grid)
            grid.innerHTML = this.renderShopGrid();
    }
}
export const ShopHUD = ShopHudPanel;
