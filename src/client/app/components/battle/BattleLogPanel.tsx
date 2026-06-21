import type { BattleHudLogLine } from '../../bridge/battleHudBridge.js';
import { BATTLE_LOG_EMITTER_CLASS } from '../../../ui/battle/battleLogColors.js';

type BattleLogPanelProps = {
  lines: readonly BattleHudLogLine[];
};

function emitterMessageClass(emitter: BattleHudLogLine['emitter']): string {
  const key = emitter.toLowerCase() as keyof typeof BATTLE_LOG_EMITTER_CLASS;
  return BATTLE_LOG_EMITTER_CLASS[key];
}

export function BattleLogPanel({ lines }: BattleLogPanelProps) {
  return (
    <section className="battle-log-panel terminal-panel" aria-label="Battle Log">
      <h2 className="battle-panel-title">
        <span className="terminal-prompt">&gt;</span>
        {' '}
        BATTLE_LOG
      </h2>
      <div id="react-battle-log" className="battle-log battle-log--mono" role="log" aria-live="polite">
        {lines.map((line) => (
          <div
            key={line.id}
            className={[
              'battle-log__line',
              line.tone === 'alert' ? 'battle-log__line--alert' : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="battle-log__timestamp">
              [
              {line.timestamp}
              ]
              {' '}
            </span>
            <span
              className={[
                'battle-log__message',
                emitterMessageClass(line.emitter),
                line.kind === 'formula' ? 'battle-log__message--formula' : '',
              ].filter(Boolean).join(' ')}
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
