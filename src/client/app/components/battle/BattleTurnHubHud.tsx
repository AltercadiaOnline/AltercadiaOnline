import { useBattleHudStore } from '../../battle/battleHudStore.js';

/**
 * Timer + fase do turno — único nó que re-renderiza no tick ~100ms.
 * Não passa turnTimer por props do BattleHUD pai.
 */
export function BattleTurnHubHud() {
  const turnPhase = useBattleHudStore((state) => state.turnPhase);
  const turnPhaseActive = useBattleHudStore((state) => state.turnPhaseActive);
  const turnTimer = useBattleHudStore((state) => state.turnTimer);

  const fillClass = [
    'battle-turn-timer-bar__fill',
    turnTimer.barRatio <= 0 ? 'is-empty' : '',
    turnTimer.isUrgent ? 'is-urgent' : '',
  ].filter(Boolean).join(' ');

  const timerClass = [
    'battle-turn-timer',
    turnTimer.isUrgent ? 'is-urgent' : '',
  ].filter(Boolean).join(' ');

  const phaseClass = [
    'battle-turn-phase',
    turnPhaseActive ? 'battle-turn-phase--active' : 'battle-turn-phase--waiting',
  ].join(' ');

  return (
    <div className="battle-turn-hub" aria-live="polite">
      <p className={phaseClass}>{turnPhase}</p>
      <p className={`battle-turn-waiting${turnPhaseActive ? ' hidden' : ''}`}>
        {turnPhase}
      </p>
      <div className="battle-turn-timer-track" role="progressbar" aria-label="Tempo restante do turno">
        <div className={fillClass} style={{ width: `${Math.min(100, turnTimer.barRatio * 100)}%` }} />
      </div>
      <div className="battle-timer-ring">
        <span className={timerClass}>
          {turnTimer.enabled ? turnTimer.displaySec : '—'}
        </span>
      </div>
    </div>
  );
}
