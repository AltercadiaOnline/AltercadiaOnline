import { buildPlayerLevelProgressionTooltip } from '../../../shared/progression/progressionTooltipContent.js';
import {
  patchProgressionTooltipAttrs,
  renderProgressionTooltipAttrs,
} from '../tooltip/progressionTooltipAttrs.js';
import { formatLevelWithClass } from '../../../shared/character/combatClassDisplay.js';
import {
  resolveCharacterLevelXpBar,
  type CharacterLevelXpBarView,
} from '../../../shared/character/characterLevelProgression.js';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import type { ClassType } from '../../../shared/types/classes.js';
import {
  computeSpeedBonusTotal,
} from '../../../shared/character/playerStatsBonus.js';
import {
  formatWorldExplorationMoveSpeedDisplay,
  resolveWorldExplorationMoveSpeed,
  type WorldExplorationMoveSpeedSnapshot,
} from '../../../shared/world/worldExplorationMoveSpeed.js';
import type { PlayerVitals } from '../equipment/playerEquipmentStore.js';
import { resolveLoadoutPpBudget } from '../../../shared/combat/loadoutPpBudget.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import {
  VELOCIDADE_STAT_DESCRIPTION,
  VELOCIDADE_STAT_LABEL,
} from '../../../shared/stats/statDisplayLabels.js';

/**
 * Progressão de Nível na ficha — nível/XP, vitais (HP, PP) e deslocamento no mapa.
 * O stat Velocidade do SET alimenta mapa e iniciativa; aqui exibimos só px/s no mundo.
 */

export type LevelProgressionSectionModel = {
  readonly profile: PlayerProfileSnapshot;
  readonly classId: ClassType;
  readonly vitals: PlayerVitals;
  readonly speedBonusTotal: number;
  readonly isEncumbered: boolean;
};

function playerLevelTooltipAttrs(
  profile: PlayerProfileSnapshot,
  barView?: CharacterLevelXpBarView,
): string {
  return renderProgressionTooltipAttrs(buildPlayerLevelProgressionTooltip(profile, barView));
}

function patchPlayerLevelTooltipAttrs(
  host: HTMLElement,
  profile: PlayerProfileSnapshot,
  barView?: CharacterLevelXpBarView,
): void {
  const bar = host.querySelector<HTMLElement>('[data-progression-tooltip]');
  if (!bar) return;
  patchProgressionTooltipAttrs(bar, buildPlayerLevelProgressionTooltip(profile, barView));
}

/** Barra compacta de XP para a sidebar de equipamentos. */
export function renderSidebarLevelProgression(profile: PlayerProfileSnapshot): string {
  const bar = resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  const progressionAttrs = playerLevelTooltipAttrs(profile, bar);

  return `
    <p class="equipment-sidebar__progression-level" data-sidebar-level>Nv. ${profile.level}</p>
    <div
      class="equipment-sidebar__xp-bar"
      role="progressbar"
      ${progressionAttrs}
      aria-valuenow="${bar.xpCurrent}"
      aria-valuemax="${bar.xpToNext}"
      aria-label="Experiência até o próximo nível"
    >
      <div class="equipment-sidebar__xp-fill" data-sidebar-xp-fill style="width:${bar.percent}%"></div>
    </div>
    <p class="equipment-sidebar__xp-text" data-sidebar-xp-text>${bar.xpCurrent} / ${bar.xpToNext} XP</p>
    <p class="equipment-sidebar__xp-hint" data-sidebar-xp-hint>Faltam ${bar.remaining} XP para up</p>
  `;
}

export function patchSidebarLevelProgression(
  host: HTMLElement,
  profile: PlayerProfileSnapshot,
  barView?: CharacterLevelXpBarView,
): void {
  const bar = barView ?? resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);

  const levelEl = host.querySelector<HTMLElement>('[data-sidebar-level]');
  if (levelEl) levelEl.textContent = `Nv. ${bar.level}`;

  const fill = host.querySelector<HTMLElement>('[data-sidebar-xp-fill]');
  if (fill) fill.style.width = `${bar.percent}%`;

  const xpText = host.querySelector<HTMLElement>('[data-sidebar-xp-text]');
  if (xpText) xpText.textContent = `${bar.xpCurrent} / ${bar.xpToNext} XP`;

  const hint = host.querySelector<HTMLElement>('[data-sidebar-xp-hint]');
  if (hint) hint.textContent = `Faltam ${bar.remaining} XP para up`;

  const barEl = host.querySelector<HTMLElement>('.equipment-sidebar__xp-bar');
  if (barEl) {
    barEl.setAttribute('aria-valuenow', String(bar.xpCurrent));
    barEl.setAttribute('aria-valuemax', String(bar.xpToNext));
  }

  patchPlayerLevelTooltipAttrs(host, profile, bar);
}

function resolveMoveSpeedView(model: LevelProgressionSectionModel): WorldExplorationMoveSpeedSnapshot {
  return resolveWorldExplorationMoveSpeed(model.speedBonusTotal, model.isEncumbered);
}

function resolveLoadoutPpDisplayText(): string {
  const { ppCurrent, ppMax } = resolveLoadoutPpBudget(getGlobalPlayerStore().getConfirmedLoadout());
  return ppMax > 0 ? `${ppCurrent} / ${ppMax}` : '—';
}

function renderVitalRows(model: LevelProgressionSectionModel): string {
  const { vitals } = model;
  const moveSpeed = resolveMoveSpeedView(model);
  const moveSpeedText = formatWorldExplorationMoveSpeedDisplay(moveSpeed);

  const rows = [
    { id: 'hp', label: 'HP', value: `${vitals.hpCurrent} / ${vitals.hpMax}`, aria: 'Pontos de vida' },
    { id: 'pp', label: 'PP', value: resolveLoadoutPpDisplayText(), aria: 'Pontos de poder (soma do loadout de 4 moves)' },
    {
      id: 'move-speed',
      label: VELOCIDADE_STAT_LABEL,
      value: moveSpeedText,
      aria: `${VELOCIDADE_STAT_DESCRIPTION} Valor exibido: deslocamento no mapa (px/s).`,
    },
  ] as const;

  return rows
    .map(
      (row) => `
      <li class="character-level-progression-row" data-level-vital="${row.id}">
        <div class="character-level-progression-row__head">
          <span class="character-level-progression-row__label">${row.label}</span>
          <strong
            class="character-level-progression-row__value"
            data-level-vital-value="${row.id}"
            title="${row.aria}"
          >${row.value}</strong>
        </div>
      </li>
    `,
    )
    .join('');
}

export function renderLevelProgressionSection(model: LevelProgressionSectionModel): string {
  const { profile, classId } = model;
  const bar = resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  const progressionAttrs = playerLevelTooltipAttrs(profile, bar);

  return `
    <section class="character-stats-block" aria-label="Progressão de Nível" data-level-progression-section>
      <header class="character-stats-block__header">
        <h3 class="character-stats-block__title">Progressão de Nível</h3>
      </header>
      <p class="character-stats-block__level" data-char-level>${formatLevelWithClass(profile.level, classId)}</p>
      <div class="character-xp-bar" role="progressbar" ${progressionAttrs} aria-valuenow="${bar.xpCurrent}" aria-valuemax="${bar.xpToNext}" aria-label="Experiência">
        <div class="character-xp-bar__fill" data-xp-fill style="width:${bar.percent}%"></div>
      </div>
      <p class="character-xp-text" data-xp-text>${bar.xpCurrent} / ${bar.xpToNext} XP</p>
      <ul class="character-level-progression-list" data-level-progression-vitals aria-label="Status do personagem no mundo">
        ${renderVitalRows(model)}
      </ul>
    </section>
  `;
}

export function patchLevelProgressionSection(
  section: HTMLElement,
  model: LevelProgressionSectionModel,
): void {
  const { profile, classId, vitals } = model;
  const bar = resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  const moveSpeedText = formatWorldExplorationMoveSpeedDisplay(resolveMoveSpeedView(model));

  const levelEl = section.querySelector<HTMLElement>('[data-char-level]');
  if (levelEl) levelEl.textContent = formatLevelWithClass(profile.level, classId);

  const fill = section.querySelector<HTMLElement>('[data-xp-fill]');
  if (fill) fill.style.width = `${bar.percent}%`;

  const xpText = section.querySelector<HTMLElement>('[data-xp-text]');
  if (xpText) xpText.textContent = `${bar.xpCurrent} / ${bar.xpToNext} XP`;

  const barEl = section.querySelector<HTMLElement>('.character-xp-bar');
  if (barEl) {
    barEl.setAttribute('aria-valuenow', String(bar.xpCurrent));
    barEl.setAttribute('aria-valuemax', String(bar.xpToNext));
  }

  patchPlayerLevelTooltipAttrs(section, profile, bar);

  const hpValue = section.querySelector<HTMLElement>('[data-level-vital-value="hp"]');
  if (hpValue) hpValue.textContent = `${vitals.hpCurrent} / ${vitals.hpMax}`;

  const ppValue = section.querySelector<HTMLElement>('[data-level-vital-value="pp"]');
  if (ppValue) ppValue.textContent = resolveLoadoutPpDisplayText();

  const moveValue = section.querySelector<HTMLElement>('[data-level-vital-value="move-speed"]');
  if (moveValue) moveValue.textContent = moveSpeedText;
}

/** Bônus % de mapa a partir da Velocidade do SET (`statsBonus.agilidade`, espelho local). */
export function resolveExplorationSpeedBonusFromAgility(agilidade: number): number {
  return computeSpeedBonusTotal(agilidade, 0);
}
