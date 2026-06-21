import type { BattleHudTurnTimerSnapshot } from '../../battle/battleHudTypes.js';

type BattleTurnHubHudProps = {
  turnPhase: string;
  turnPhaseActive: boolean;
  turnTimer: BattleHudTurnTimerSnapshot;
};

export function BattleTurnHubHud({
  turnPhase,
  turnPhaseActive,
  turnTimer,
}: BattleTurnHubHudProps) {
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
