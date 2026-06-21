import type { BattleHudFighterSnapshot } from '../../bridge/battleHudBridge.js';
import { BattleStatusChips } from './BattleStatusChips.js';

type BattleFighterHudProps = {
  side: 'ally' | 'foe';
  fighter: BattleHudFighterSnapshot | null;
  ariaLabel: string;
};

export function BattleFighterHud({ side, fighter, ariaLabel }: BattleFighterHudProps) {
  const headerClass = side === 'ally'
    ? 'battle-sprite-hud battle-sprite-hud--ally'
    : [
      'battle-sprite-hud',
      'battle-sprite-hud--foe',
      fighter?.isMirrorBot ? 'battle-sprite-hud--mirror-bot' : '',
    ].filter(Boolean).join(' ');

  const hpBarClass = side === 'foe' ? 'battle-hp-bar battle-hp-bar--enemy' : 'battle-hp-bar';

  return (
    <header className={headerClass} aria-label={ariaLabel}>
      <p className="battle-fighter-name">
        {fighter?.name ?? '—'}
        {fighter?.isMirrorBot ? (
          <span
            className="battle-mirror-bot-badge"
            title="Player Espelho — instância de teste"
            aria-label="Instância de teste automatizada"
          >
            BOT
          </span>
        ) : null}
      </p>
      <p className="battle-fighter-class">{fighter?.classLabel ?? '—'}</p>
      <div className={hpBarClass} role="progressbar" aria-label={`HP ${ariaLabel}`}>
        <div
          className="battle-hp-bar__fill"
          style={{ width: `${fighter?.hpRatio ?? 0}%` }}
        />
      </div>
      <p className="battle-hp-text">
        {fighter ? `${Math.max(0, Math.ceil(fighter.hp))} / ${fighter.maxHp}` : '— / —'}
      </p>
      <BattleStatusChips statuses={fighter?.statuses ?? []} />
    </header>
  );
}
