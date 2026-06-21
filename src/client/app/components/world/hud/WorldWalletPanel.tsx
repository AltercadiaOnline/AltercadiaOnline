import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CurrencyService } from '../../../../services/index.js';
import { subscribeGameStore } from '../../../../state/GameStore.js';
import { tweenVoltsCounter } from '../../../../ui/wallet/voltsCounterTween.js';

export function WorldWalletPanel() {
  const voltsRef = useRef<HTMLDivElement>(null);
  const displayedVoltsRef = useRef(0);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const spentFlashRef = useRef(false);

  const balanceKey = useSyncExternalStore(
    (onChange) => subscribeGameStore('player', () => onChange()),
    () => {
      const payload = CurrencyService.getBalanceChangedPayload();
      return `${payload.dollarVolt}|${payload.alterCoins}|${payload.voltsFormatted}|${payload.alterFormatted}`;
    },
    () => '',
  );

  const payload = CurrencyService.getBalanceChangedPayload();

  useEffect(() => {
    const voltsEl = voltsRef.current;
    if (!voltsEl) return undefined;

    const balance = CurrencyService.getBalanceChangedPayload();
    const alterEl = voltsEl.parentElement?.querySelector('[data-wallet-alter-coins]');
    if (alterEl instanceof HTMLElement) {
      alterEl.textContent = balance.alterFormatted;
    }

    const from = displayedVoltsRef.current;
    const to = balance.dollarVolt;
    const isDebit = balance.deltaVolts < 0;

    cancelTweenRef.current?.();
    cancelTweenRef.current = null;

    if (Math.abs(from - to) < 0.005) {
      voltsEl.textContent = balance.voltsFormatted;
      displayedVoltsRef.current = to;
      return undefined;
    }

    if (isDebit) {
      voltsEl.classList.add('sidebar-wallet__slot--spent-flash');
      spentFlashRef.current = true;
    }

    cancelTweenRef.current = tweenVoltsCounter(voltsEl, from, to, {
      durationMs: isDebit ? 280 : 360,
      onComplete: () => {
        displayedVoltsRef.current = to;
        voltsEl.textContent = balance.voltsFormatted;
        if (spentFlashRef.current) {
          voltsEl.classList.remove('sidebar-wallet__slot--spent-flash');
          spentFlashRef.current = false;
        }
      },
    });

    return () => {
      cancelTweenRef.current?.();
      cancelTweenRef.current = null;
    };
  }, [balanceKey]);

  return (
    <div className="sidebar-wallet" aria-label="Carteira">
      <div ref={voltsRef} className="sidebar-wallet__slot" data-wallet-volts aria-label="Saldo VOLTS">
        {payload.voltsFormatted}
      </div>
      <div className="sidebar-wallet__slot" data-wallet-alter-coins aria-label="Saldo ALTER COINS">
        {payload.alterFormatted}
      </div>
    </div>
  );
}
