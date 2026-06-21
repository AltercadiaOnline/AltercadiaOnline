import type { CSSProperties } from 'react';
import { resolveStatusVisual } from '../../../config/statusVisuals.js';
import type { ActiveStatusChip } from '../../../hud/activeStatusAdapter.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';

type BattleStatusChipsProps = {
  statuses: readonly ActiveStatusChip[];
};

function resolveStatusAria(chip: ActiveStatusChip): string {
  const visual = resolveStatusVisual(chip.id);
  const parts = [visual.label, chip.id.replace(/_/g, ' ').toLowerCase()];
  if (chip.turnsRemaining > 0 && chip.turnsRemaining < 999) {
    parts.push(`${chip.turnsRemaining} turno(s) restante(s)`);
  }
  if (chip.stacks > 1) {
    parts.push(`x${chip.stacks}`);
  }
  return parts.join(', ');
}

function showStatusTooltip(chip: ActiveStatusChip, element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
    data: {
      kind: 'status',
      statusId: chip.id,
      chip: {
        stacks: chip.stacks,
        turnsRemaining: chip.turnsRemaining,
      },
    },
    x: rect.left + rect.width / 2,
    y: rect.top,
    placement: 'above',
  });
}

export function BattleStatusChips({ statuses }: BattleStatusChipsProps) {
  if (statuses.length === 0) {
    return (
      <div className="battle-status-row status-container status-container--empty" aria-label="Status" />
    );
  }

  return (
    <div className="battle-status-row status-container" aria-label="Status">
      {statuses.map((chip) => {
        const visual = resolveStatusVisual(chip.id);
        return (
          <span
            key={chip.id}
            className="status-chip"
            data-status-id={chip.id}
            data-icon-id={visual.iconId}
            style={{ '--status-color': visual.color } as CSSProperties}
            tabIndex={0}
            role="img"
            aria-label={resolveStatusAria(chip)}
            onMouseEnter={(event) => showStatusTooltip(chip, event.currentTarget)}
            onMouseLeave={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}
            onFocus={(event) => showStatusTooltip(chip, event.currentTarget)}
            onBlur={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}
          >
            {visual.iconPath ? (
              <img className="status-chip__icon" src={visual.iconPath} alt="" />
            ) : null}
            <span className={visual.iconPath ? 'status-chip__label hidden' : 'status-chip__label'}>
              {visual.label}
            </span>
            {chip.stacks > 1 ? (
              <span className="status-chip__stacks">{chip.stacks}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
