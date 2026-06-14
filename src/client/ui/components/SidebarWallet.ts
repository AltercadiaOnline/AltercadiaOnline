import { formatAlterCoins } from '../../../shared/economy/premiumCurrency.js';
import { CurrencyService } from '../../services/index.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import type { BalanceChangedPayload } from '../../../shared/economy/events.js';
import { tweenVoltsCounter } from '../wallet/voltsCounterTween.js';

/**
 * Carteira fixa na barra lateral — VOLTS (in-game) e ALTER COINS (premium).
 * Passiva: reflete o GameStore.player.gold via subscribe reativo.
 */
export class SidebarWallet {
  private readonly host: HTMLElement;
  private readonly voltsEl: HTMLElement;
  private readonly alterCoinsEl: HTMLElement;
  private unsubBalance: (() => void) | null = null;
  private cancelVoltsTween: (() => void) | null = null;
  private displayedVolts = 0;

  private constructor(host: HTMLElement, voltsEl: HTMLElement, alterCoinsEl: HTMLElement) {
    this.host = host;
    this.voltsEl = voltsEl;
    this.alterCoinsEl = alterCoinsEl;
  }

  static mount(host: HTMLElement): SidebarWallet {
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

  attach(): void {
    this.unsubBalance = subscribeGameStore('player', () => {
      this.applyBalanceChange(CurrencyService.getBalanceChangedPayload());
    });
  }

  detach(): void {
    this.unsubBalance?.();
    this.unsubBalance = null;
    this.cancelVoltsTween?.();
    this.cancelVoltsTween = null;
    this.host.replaceChildren();
  }

  private applyBalanceChange(payload: BalanceChangedPayload): void {
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

let activeWallet: SidebarWallet | null = null;

export function initSidebarWallet(): SidebarWallet {
  const host = document.getElementById('sidebar-wallet');
  if (!host) {
    throw new Error('[UI] #sidebar-wallet não encontrado.');
  }

  if (!activeWallet) {
    activeWallet = SidebarWallet.mount(host);
    activeWallet.attach();
  }

  return activeWallet;
}

export function getSidebarWallet(): SidebarWallet | null {
  return activeWallet;
}

export function destroySidebarWallet(): void {
  activeWallet?.detach();
  activeWallet = null;
}

/** @deprecated Use CurrencyService.getCurrencySnapshot() */
export function renderSidebarWalletFromStore(): void {
  const snap = CurrencyService.getCurrencySnapshot();
  const host = document.getElementById('sidebar-wallet');
  const voltsEl = host?.querySelector('[data-wallet-volts]');
  const alterEl = host?.querySelector('[data-wallet-alter-coins]');
  if (voltsEl instanceof HTMLElement) voltsEl.textContent = snap.voltsFormatted;
  if (alterEl instanceof HTMLElement) alterEl.textContent = formatAlterCoins(snap.alterCoins);
}
