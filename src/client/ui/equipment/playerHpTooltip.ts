import { formatPlayerHpBonusTooltipLines } from '../../../shared/character/playerHpBonusBreakdown.js';
import { resolvePlayerHpBonusBreakdownFromLoadoutInput } from '../../../shared/character/resolvePlayerHpMax.js';
import { hideGameTooltip, showHintTooltip } from '../tooltip/showGameTooltip.js';
import { buildHudCombatLoadoutInput } from './playerHudHpMax.js';
import { getPlayerEquipmentStore } from './playerEquipmentStore.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { getPlayerMarcosStore } from '../marcos/playerMarcosStore.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';

const HP_TOOLTIP_TITLE = 'Vida do personagem';

export function resolvePlayerHpTooltipFromStores(): {
  readonly title: string;
  readonly lines: readonly string[];
} {
  const equip = getPlayerEquipmentStore().getSnapshot();
  const marcos = getPlayerMarcosStore().getSnapshot();
  const breakdown = resolvePlayerHpBonusBreakdownFromLoadoutInput(
    buildHudCombatLoadoutInput({
      classId: equip.classId,
      level: equip.level,
      equipped: getPlayerItemStore().getEquippedSlots(),
      activeMarcos: marcos.activeMarcos,
      nodeProgression: marcos.nodeProgression,
      flowSpeedBase: marcos.flowSpeedBase,
      equippedSkillIds: getGlobalPlayerStore().getConfirmedLoadout(),
    }),
  );

  return {
    title: HP_TOOLTIP_TITLE,
    lines: formatPlayerHpBonusTooltipLines(breakdown),
  };
}

export function showPlayerHpTooltip(clientX: number, clientY: number): void {
  const tip = resolvePlayerHpTooltipFromStores();
  showHintTooltip(tip.title, clientX, clientY, { lines: tip.lines });
}

export function hidePlayerHpTooltip(): void {
  hideGameTooltip();
}

/** Bind hover na ficha (HTML string) — barra/valor de HP. */
export function bindPlayerHpTooltipHost(host: HTMLElement): () => void {
  const onEnter = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('[data-level-vital="hp"]')) return;
    showPlayerHpTooltip(event.clientX, event.clientY);
  };

  const onLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && host.contains(related)) {
      const stillOnHp =
        related instanceof Element && Boolean(related.closest('[data-level-vital="hp"]'));
      if (stillOnHp) return;
    }
    hidePlayerHpTooltip();
  };

  host.addEventListener('mouseover', onEnter);
  host.addEventListener('mouseout', onLeave);
  return () => {
    host.removeEventListener('mouseover', onEnter);
    host.removeEventListener('mouseout', onLeave);
  };
}
