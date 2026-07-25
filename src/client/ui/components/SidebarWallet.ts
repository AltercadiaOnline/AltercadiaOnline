// @ts-nocheck
import { CurrencyService } from '../../services/index.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import { tweenVoltsCounter } from '../wallet/voltsCounterTween.js';
/**
 * Carteira fixa na barra lateral — VOLTS (in-game) e ALTER COINS (premium).
 * Passiva: reflete o GameStore.player.gold via subscribe reativo.
 */
export class SidebarWallet {
    host;
    voltsEl;
    alterCoinsEl;
    unsubBalance = null;
    cancelVoltsTween = null;
    displayedVolts = 0;
    constructor(host, voltsEl, alterCoinsEl) {
        this.host = host;
        this.voltsEl = voltsEl;
        this.alterCoinsEl = alterCoinsEl;
    }
    static mount(host) {
        host.innerHTML = `
      <div class="sidebar-wallet__slot" data-wallet-volts aria-label="Saldo VOLTS">0 VOLTS</div>
      <div class="sidebar-wallet__slot" data-wallet-alter-coins aria-label="Saldo ALTER COINS">0 ALTER COINS</div>
    `;
        const voltsEl = host.querySelector('[data-wallet-volts]');
        const alterCoinsEl = host.querySelector('[data-wallet-alter-coins]');
        if (!(voltsEl instanceof HTMLElement) || !(alterCoinsEl instanceof HTMLElement)) {
            throw new Error('[SidebarWallet] Slots de moeda não encontrados após mount.');
        }
        return new SidebarWallet(host, voltsEl, alterCoinsEl);
    }
    attach() {
        this.unsubBalance = subscribeGameStore('player', () => {
            this.applyBalanceChange(CurrencyService.getBalanceChangedPayload());
        });
    }
    detach() {
        this.unsubBalance?.();
        this.unsubBalance = null;
        this.cancelVoltsTween?.();
        this.cancelVoltsTween = null;
        this.host.replaceChildren();
    }
    applyBalanceChange(payload) {
        this.alterCoinsEl.textContent = payload.alterFormatted;
        const from = this.displayedVolts;
        const to = payload.dollarVolt;
        const isDebit = payload.deltaVolts < 0;
        this.cancelVoltsTween?.();
        this.cancelVoltsTween = null;
        if (Math.abs(from - to) < 0.005) {
            this.voltsEl.textContent = payload.voltsFormatted;
            this.displayedVolts = to;
            return;
        }
        if (isDebit) {
            this.voltsEl.classList.add('sidebar-wallet__slot--spent-flash');
        }
        this.cancelVoltsTween = tweenVoltsCounter(this.voltsEl, from, to, {
            durationMs: isDebit ? 280 : 360,
            onComplete: () => {
                this.displayedVolts = to;
                this.voltsEl.textContent = payload.voltsFormatted;
                if (isDebit) {
                    this.voltsEl.classList.remove('sidebar-wallet__slot--spent-flash');
                }
            },
        });
    }
}
let activeWallet = null;
export function getSidebarWallet() {
    return activeWallet;
}
export function destroySidebarWallet() {
    activeWallet?.detach();
    activeWallet = null;
}
