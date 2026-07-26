import { useEffect, type RefObject } from 'react';
import { updateBattleStageScale } from '../../layout/gameLayout.js';

const DEFAULT_TOP_CHROME_PX = 72;
const DEFAULT_BOTTOM_CHROME_PX = 152;

function applyBattleChromeInsets(topPx: number, bottomPx: number): void {
  document.documentElement.style.setProperty('--battle-top-chrome-px', `${topPx}px`);
  document.documentElement.style.setProperty('--battle-bottom-chrome-px', `${bottomPx}px`);
  updateBattleStageScale();
}

/**
 * Mede a faixa superior (vitals) e inferior (moveset/log) da HUD React
 * e reserva o mesmo espaço na arena (#battle-stage-frame).
 */
export function useBattleLayoutChrome(frameRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const sync = (): void => {
      if (!document.body.classList.contains('battle-arena-active')) return;

      const vitalsHost = frame.querySelector<HTMLElement>('.battle-hud-top-chrome');
      const bottom = frame.querySelector<HTMLElement>('.battle-hud-bottom-strip');
      const topPx = vitalsHost && vitalsHost.offsetHeight > 0
        ? Math.ceil(vitalsHost.getBoundingClientRect().height)
        : DEFAULT_TOP_CHROME_PX;
      const bottomPx = bottom && bottom.offsetHeight > 0
        ? Math.ceil(bottom.getBoundingClientRect().height)
        : DEFAULT_BOTTOM_CHROME_PX;

      applyBattleChromeInsets(topPx, bottomPx);
    };

    sync();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => sync())
      : null;

    observer?.observe(frame);
    for (const selector of ['.battle-hud-top-chrome', '.battle-hud-bottom-strip'] as const) {
      const el = frame.querySelector<HTMLElement>(selector);
      if (el) observer?.observe(el);
    }

    window.addEventListener('resize', sync);
    document.addEventListener('fullscreenchange', sync);
    window.visualViewport?.addEventListener('resize', sync);

    const bodyObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => sync())
      : null;
    bodyObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const rafId = window.requestAnimationFrame(() => {
      sync();
      window.requestAnimationFrame(sync);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
      document.removeEventListener('fullscreenchange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      observer?.disconnect();
      bodyObserver?.disconnect();
    };
  }, [frameRef]);
}
