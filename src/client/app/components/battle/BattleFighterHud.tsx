import type { BattleHudFighterSnapshot } from '../../battle/battleHudTypes.js';
import { BattleStatusChips } from './BattleStatusChips.js';

type BattleFighterHudProps = {
  side: 'ally' | 'foe';
  fighter: BattleHudFighterSnapshot | null;
  ariaLabel: string;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

export function BattleFighterHud({
  side,
  fighter,
  ariaLabel,
  compact = false,
  selected = false,
  onSelect,
}: BattleFighterHudProps) {
  const headerClass = side === 'ally'
    ? 'battle-sprite-hud battle-sprite-hud--ally'
    : [
      'battle-sprite-hud',
      'battle-sprite-hud--foe',
      compact ? 'battle-sprite-hud--foe-compact' : '',
      selected ? 'battle-sprite-hud--foe-selected' : '',
      onSelect ? 'battle-sprite-hud--foe-selectable' : '',
      side === 'foe' && fighter && fighter.hp <= 0 ? 'battle-sprite-hud--foe-down' : '',
      fighter?.isMirrorBot ? 'battle-sprite-hud--mirror-bot' : '',
    ].filter(Boolean).join(' ');

  const hpBarClass = side === 'foe' ? 'battle-hp-bar battle-hp-bar--enemy' : 'battle-hp-bar';
  const interactive = Boolean(onSelect);

  const body = (
    <>
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
      {compact ? null : (
        <p className="battle-fighter-class">{fighter?.classLabel ?? '—'}</p>
      )}
      <div className={hpBarClass} role="progressbar" aria-label={`HP ${ariaLabel}`}>
        <div
          className="battle-hp-bar__fill"
          style={{ width: `${fighter?.hpRatio ?? 0}%` }}
        />
      </div>
      <p className="battle-hp-text">
        {fighter
          ? fighter.hp <= 0 && side === 'foe'
            ? 'Derrotado'
            : `${Math.max(0, Math.ceil(fighter.hp))} / ${fighter.maxHp}`
          : '— / —'}
      </p>
      {compact ? null : <BattleStatusChips statuses={fighter?.statuses ?? []} />}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={headerClass}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {body}
      </button>
    );
  }

  return (
    <header className={headerClass} aria-label={ariaLabel}>
      {body}
    </header>
  );
}
