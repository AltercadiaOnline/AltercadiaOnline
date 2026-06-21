import { useMemo } from 'react';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../../shared/combat/moveTypes.js';
import { resolveMoveDefinitionForUi } from '../../../../shared/combat/movesetLoadout.js';
import type { BattleMenuMove } from '../../../hud/BattleMenu.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';

type BattleMovesetPaletteProps = {
  moves: readonly BattleMenuMove[];
  enabled: boolean;
  turnBlocked: boolean;
  onSelectMove: (moveId: string) => void;
};

function buildSlots(moves: readonly BattleMenuMove[]): Array<BattleMenuMove | null> {
  const slots: Array<BattleMenuMove | null> = [...moves.slice(0, ACTIVE_MOVESET_SLOT_COUNT)];
  while (slots.length < ACTIVE_MOVESET_SLOT_COUNT) slots.push(null);
  return slots;
}

function showMoveTooltip(moveId: string, element: HTMLElement): void {
  const move = resolveMoveDefinitionForUi(moveId);
  if (!move) return;
  const rect = element.getBoundingClientRect();
  uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
    data: { kind: 'move', data: move },
    x: rect.left + rect.width / 2,
    y: rect.top,
    placement: 'above',
  });
}

export function BattleMovesetPalette({
  moves,
  enabled,
  turnBlocked,
  onSelectMove,
}: BattleMovesetPaletteProps) {
  const slots = useMemo(() => buildSlots(moves), [moves]);
  const paletteEnabled = enabled && !turnBlocked;

  return (
    <div
      id="react-skill-palette-row"
      className={[
        'skill-palette',
        'battle-skill-slots',
        'battle-moveset-drawer',
        'battle-menu',
        turnBlocked ? 'turn-guard--blocked' : '',
        paletteEnabled ? '' : 'is-disabled',
      ].filter(Boolean).join(' ')}
      data-hud-skill-actions
      aria-label="Moveset"
      aria-disabled={!paletteEnabled}
    >
      {slots.map((move, index) => {
        if (!move) {
          return (
            <button
              key={`empty-${index}`}
              type="button"
              className="battle-menu-btn battle-skill-slot is-empty"
              disabled
            >
              <span className="skill-name">—</span>
              <span className="skill-pp">PP —</span>
            </button>
          );
        }

        const outOfPp = move.ppCurrent <= 0;
        const lowPp = !outOfPp && move.ppMax > 0 && move.ppCurrent <= Math.ceil(move.ppMax * 0.25);
        const onCooldown = move.cooldownTurnsRemaining > 0;
        const blocked = !move.executable || outOfPp || onCooldown;
        const cooldownLabel = onCooldown ? ` · CD ${move.cooldownTurnsRemaining}` : '';
        const ppWarn = outOfPp ? ' · sem PP' : lowPp ? ' · PP baixo' : '';

        return (
          <button
            key={move.id}
            type="button"
            className={[
              'battle-menu-btn',
              'battle-skill-slot',
              outOfPp ? 'is-no-pp' : '',
              lowPp ? 'is-low-pp' : '',
              paletteEnabled && !blocked ? 'is-ready' : '',
            ].filter(Boolean).join(' ')}
            data-move-id={move.id}
            disabled={!paletteEnabled || blocked}
            onMouseEnter={(event) => showMoveTooltip(move.id, event.currentTarget)}
            onMouseLeave={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}
            onClick={() => onSelectMove(move.id)}
          >
            <span className="skill-name">{move.name}</span>
            <span className="skill-pp">
              PP
              {' '}
              {move.ppCurrent}
              /
              {move.ppMax}
              {ppWarn}
              {cooldownLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
