import type { Skill } from '../../shared/types.js';

import { ACTIVE_MOVESET_SLOT_COUNT } from '../../shared/combat/moveTypes.js';
import { resolveMoveDefinitionForUi } from '../../shared/combat/movesetLoadout.js';
import { canExecuteMove, resolveSkillCooldownTurns, resolveSkillPpCurrent, resolveSkillPpMax, skillUsesPpBudget } from '../../shared/combat/skillRuntime.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';



export type BattleMenuMove = {

  readonly id: string;

  readonly name: string;

  readonly ppCurrent: number;

  readonly ppMax: number;

  readonly cooldownTurnsRemaining: number;

  readonly executable: boolean;

};



export type BattleMenuRenderOptions = {

  readonly moves: readonly BattleMenuMove[];

  readonly enabled: boolean;

};



/**

 * Menu de comandos estilo Pokémon — 4 movimentos do loadout confirmado.

 */

export class BattleMenu {

  private readonly container: HTMLElement;

  private onMoveSelected: ((moveId: string) => void) | null = null;

  private tooltipCleanups: Array<() => void> = [];

  private options: BattleMenuRenderOptions = {

    moves: [],

    enabled: false,

  };



  constructor(container: HTMLElement) {

    this.container = container;

    this.container.classList.add('battle-menu');

  }



  setOnMoveSelected(handler: (moveId: string) => void): void {

    this.onMoveSelected = handler;

  }



  render(options: BattleMenuRenderOptions): void {

    this.clearTooltipListeners();
    this.options = options;

    this.container.innerHTML = '';



    const slots: (BattleMenuMove | null)[] = [...options.moves.slice(0, ACTIVE_MOVESET_SLOT_COUNT)];

    while (slots.length < ACTIVE_MOVESET_SLOT_COUNT) slots.push(null);



    for (const move of slots) {

      const btn = document.createElement('button');

      btn.type = 'button';

      btn.className = 'battle-menu-btn battle-skill-slot';



      if (!move) {

        btn.disabled = true;

        btn.classList.add('is-empty');

        btn.innerHTML = '<span class="skill-name">—</span><span class="skill-pp">PP —</span>';

        this.container.appendChild(btn);

        continue;

      }



      const outOfPp = move.ppCurrent <= 0;
      const lowPp = !outOfPp && move.ppMax > 0 && move.ppCurrent <= Math.ceil(move.ppMax * 0.25);
      const onCooldown = move.cooldownTurnsRemaining > 0;
      const blocked = !move.executable || outOfPp || onCooldown;

      btn.dataset.moveId = move.id;

      btn.disabled = !options.enabled || blocked;
      if (outOfPp) btn.classList.add('is-no-pp');
      else if (lowPp) btn.classList.add('is-low-pp');

      const cooldownLabel = onCooldown ? ` · CD ${move.cooldownTurnsRemaining}` : '';
      const ppWarn = outOfPp ? ' · sem PP' : lowPp ? ' · PP baixo' : '';

      btn.innerHTML = `

        <span class="skill-name">${escapeHtml(move.name)}</span>

        <span class="skill-pp">PP ${move.ppCurrent}/${move.ppMax}${ppWarn}${cooldownLabel}</span>

      `;



      if (options.enabled && !blocked) {

        btn.addEventListener('click', () => {

          this.onMoveSelected?.(move.id);

        });

      }

      this.bindMoveTooltip(btn, move.id);

      this.container.appendChild(btn);

    }



    this.container.classList.toggle('is-disabled', !options.enabled);

    this.container.toggleAttribute('aria-disabled', !options.enabled);

  }



  destroy(): void {

    this.clearTooltipListeners();
    this.container.innerHTML = '';

    this.onMoveSelected = null;

  }



  private bindMoveTooltip(element: HTMLElement, moveId: string): void {

    const onEnter = (): void => {

      const move = resolveMoveDefinitionForUi(moveId);

      if (!move) return;

      const rect = element.getBoundingClientRect();

      uiEvents.emit(UIEventType.SHOW_TOOLTIP, {

        data: { kind: 'move', data: move },

        x: rect.left + rect.width / 2,

        y: rect.top,

        placement: 'above',

      });

    };

    const onLeave = (): void => {

      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});

    };

    element.addEventListener('mouseenter', onEnter);

    element.addEventListener('mouseleave', onLeave);

    this.tooltipCleanups.push(() => {

      element.removeEventListener('mouseenter', onEnter);

      element.removeEventListener('mouseleave', onLeave);

    });

  }



  private clearTooltipListeners(): void {

    for (const off of this.tooltipCleanups) off();

    this.tooltipCleanups.length = 0;

    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});

  }

}



export function skillsToMenuMoves(skills: readonly Skill[], currentTurn: number): BattleMenuMove[] {

  return skills.map((skill) => ({

    id: skill.id,

    name: skill.name,

      ppCurrent: skillUsesPpBudget(skill) ? resolveSkillPpCurrent(skill) : resolveSkillPpMax(skill) || 0,
      ppMax: skillUsesPpBudget(skill) ? resolveSkillPpMax(skill) : 0,

    cooldownTurnsRemaining: resolveSkillCooldownTurns(skill),

    executable: canExecuteMove(skill, currentTurn),

  }));

}



function escapeHtml(value: string): string {

  return value

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;');

}

