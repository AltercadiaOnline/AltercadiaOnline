import { resolveMoveProgressionForChar } from '../../../../../shared/progression/moveMasteryCap.js';
import { totalMasteryXpFromSnapshot } from '../../../../../shared/progression/moveProgression.js';
import {
  buildMoveMasteryProgressionTooltip,
  resolveProgressionPercent,
} from '../../../../../shared/progression/progressionTooltipContent.js';
import type { MovesProgressionSnapshot } from '../../../../../shared/playerDataSnapshots.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';

type MovesetMoveProgressProps = {
  readonly moveId: string;
  readonly moveName: string;
  readonly movesProgression: MovesProgressionSnapshot;
  readonly characterLevel: number;
};

export function MovesetMoveProgress({
  moveId,
  moveName,
  movesProgression,
  characterLevel,
}: MovesetMoveProgressProps) {
  const snap = movesProgression.byMoveId[moveId];
  const masteryXp = snap ? totalMasteryXpFromSnapshot(snap) : 0;
  const progression = resolveMoveProgressionForChar(moveId, masteryXp, characterLevel);
  const capped = progression.masteryCappedForCharLevel === true;
  const pct = capped
    ? 100
    : resolveProgressionPercent(progression.xp, progression.nextLevelThreshold);

  const showProgressTooltip = (event: React.MouseEvent<HTMLElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: {
        kind: 'progression',
        data: buildMoveMasteryProgressionTooltip(moveId, progression, moveName),
      },
      x: rect.left + rect.width / 2,
      y: rect.top,
      placement: 'above',
    });
  };

  const hideTooltip = (): void => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  };

  return (
    <div className="loadout-card__progress">
      <span className="loadout-card__level">Nvl. {progression.level}</span>
      <div
        className={
          capped
            ? 'loadout-card__xp-bar loadout-card__xp-bar--mastery-capped'
            : 'loadout-card__xp-bar'
        }
        role="progressbar"
        aria-valuenow={capped ? (progression.masteryCapLevel ?? progression.level) : progression.xp}
        aria-valuemax={
          capped ? (progression.masteryCapLevel ?? progression.level) : progression.nextLevelThreshold
        }
        aria-label={capped ? 'Domínio no teto para o nível atual' : 'Domínio do movimento'}
        onMouseEnter={showProgressTooltip}
        onMouseLeave={hideTooltip}
      >
        <div
          className={
            capped
              ? 'loadout-card__xp-fill loadout-card__xp-fill--mastery-capped'
              : 'loadout-card__xp-fill'
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      {capped ? (
        <span className="loadout-card__cap-label">MAX LEVEL PARA NÍVEL ATUAL</span>
      ) : null}
    </div>
  );
}
