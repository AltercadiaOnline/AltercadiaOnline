// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { formatVolts } from '../../../../shared/economy/premiumCurrency.js';
import { getBalanceChangedPayload, subscribeCurrencyView } from '../../../services/currency/CurrencyService.js';
function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}
function useWalletBalances() {
    const [alterText, setAlterText] = useState(() => getBalanceChangedPayload().alterFormatted);
    const [voltsText, setVoltsText] = useState(() => getBalanceChangedPayload().voltsFormatted);
    const [voltsFlash, setVoltsFlash] = useState(false);
    const displayedVolts = useRef(getBalanceChangedPayload().dollarVolt);
    const tweenCancel = useRef(null);
    useEffect(() => subscribeCurrencyView(() => {
        const payload = getBalanceChangedPayload();
        setAlterText(payload.alterFormatted);
        const from = displayedVolts.current;
        const to = payload.dollarVolt;
        const isDebit = payload.deltaVolts < 0;
        tweenCancel.current?.();
        tweenCancel.current = null;
        if (Math.abs(from - to) < 0.005) {
            setVoltsText(payload.voltsFormatted);
            displayedVolts.current = to;
            return;
        }
        if (isDebit) {
            setVoltsFlash(true);
        }
        const durationMs = isDebit ? 280 : 360;
        const startedAt = performance.now();
        let frameId = 0;
        const tick = (now) => {
            const progress = Math.min(1, (now - startedAt) / durationMs);
            const value = from + (to - from) * easeOutCubic(progress);
            setVoltsText(formatVolts(value));
            if (progress >= 1) {
                displayedVolts.current = to;
                setVoltsText(payload.voltsFormatted);
                if (isDebit) {
                    setVoltsFlash(false);
                }
                return;
            }
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        tweenCancel.current = () => {
            cancelAnimationFrame(frameId);
        };
    }), []);
    useEffect(() => () => {
        tweenCancel.current?.();
    }, []);
    return { voltsText, alterText, voltsFlash };
}
export function SidebarWalletHud() {
    const { voltsText, alterText, voltsFlash } = useWalletBalances();
    return (<div className="pointer-events-none flex w-full flex-col gap-1.5 px-2">
      <div className={[
            'border border-[#8b6d43] bg-black px-2 py-1.5 font-mono text-[0.72rem] uppercase tracking-wide text-[#8b6d43]',
            voltsFlash ? 'brightness-125' : '',
        ].join(' ')} aria-label="Saldo VOLTS">
        {voltsText}
      </div>
      <div className="border border-[#8b6d43] bg-black px-2 py-1.5 font-mono text-[0.72rem] uppercase tracking-wide text-[#8b6d43]" aria-label="Saldo ALTER COINS">
        {alterText}
      </div>
    </div>);
}
