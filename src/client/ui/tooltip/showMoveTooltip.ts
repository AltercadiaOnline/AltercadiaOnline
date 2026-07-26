import { resolveMoveDefinitionForUi } from '../../../shared/combat/movesetLoadout.js';
import { getClassMoveById, isClassMoveId } from '../../../shared/combat/classMovesetCatalog.js';
import { getMonsterSkillById } from '../../../shared/combat/monsterSkillCatalog.js';
import type { TooltipPlacement } from './tooltipPlacement.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { showHintTooltip } from './showGameTooltip.js';
import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';

/**
 * Tooltip de move — moveset / batalha / ficha.
 * Se o catálogo de combate não resolver, cai em hint com nome + resumo.
 */
export function showMoveTooltipAt(
  moveId: string,
  clientX: number,
  clientY: number,
  placement: TooltipPlacement = 'above',
  masteryXp?: number,
): void {
  const resolvedMastery =
    masteryXp
    ?? getPlayerProgressionStore().getSnapshot().movesetMastery[moveId]
    ?? 0;
  const move = resolveMoveDefinitionForUi(moveId, resolvedMastery);
  if (move) {
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: { kind: 'move', data: move },
      x: clientX,
      y: clientY,
      placement,
    });
    return;
  }

  const classMove = isClassMoveId(moveId) ? getClassMoveById(moveId) : null;
  const monster = classMove ? null : getMonsterSkillById(moveId);
  const title = classMove?.name ?? monster?.name ?? moveId;
  const lines: string[] = [];
  if (classMove?.effectSummary) {
    lines.push(classMove.effectSummary);
  } else if (monster?.description) {
    lines.push(monster.description);
  } else {
    lines.push('Detalhes de combate indisponíveis para este movimento.');
  }

  showHintTooltip(title, clientX, clientY, { lines, placement });
}

export function hideMoveTooltip(): void {
  uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
}
