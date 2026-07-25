// @ts-nocheck
import { useEffect, useRef } from 'react';
import { formatGameTimeDigital, resolveGameDayPhase, } from '../../../../../shared/world/gameTime.js';
import { getGameTimeStore } from '../../../../world/gameTimeStore.js';
const PHASE_LABEL = {
    night: 'NOITE',
    dawn: 'AMANHECER',
    day: 'DIA',
    dusk: 'ENTARDECER',
};
/** Relógio do mundo — espelha gameTimeStore (autoridade do servidor). */
export function WorldGameClockWidget() {
    const rootRef = useRef(null);
    const timeRef = useRef(null);
    const phaseRef = useRef(null);
    useEffect(() => {
        const store = getGameTimeStore();
        const apply = (seconds) => {
            const root = rootRef.current;
            const timeEl = timeRef.current;
            const phaseEl = phaseRef.current;
            if (!root || !timeEl)
                return;
            timeEl.textContent = formatGameTimeDigital(seconds);
            const phase = resolveGameDayPhase(seconds);
            root.dataset.phase = phase;
            if (phaseEl)
                phaseEl.textContent = PHASE_LABEL[phase];
        };
        apply(store.getInterpolatedGameTime());
        const unsubscribe = store.subscribe(apply);
        let rafId = 0;
        const tick = () => {
            apply(store.getInterpolatedGameTime());
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafId);
            unsubscribe();
        };
    }, []);
    return (<div ref={rootRef} id="world-game-clock" className="world-game-clock" style={{ pointerEvents: 'auto' }} aria-live="polite" aria-label="Hora do mundo">
      <span className="world-game-clock__label">HORA MUNDO</span>
      <span ref={timeRef} className="world-game-clock__time" data-world-clock-time>
        00:00:00
      </span>
      <span ref={phaseRef} className="world-game-clock__phase" data-world-clock-phase>
        —
      </span>
    </div>);
}
