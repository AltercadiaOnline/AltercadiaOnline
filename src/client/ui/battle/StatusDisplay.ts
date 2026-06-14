import { resolveStatusVisual } from '../../config/statusVisuals.js';

import type { ActiveStatusChip } from '../../hud/activeStatusAdapter.js';

import { uiEvents, UIEventType } from '../uiEvents.js';



export type StatusDisplayOptions = {

  readonly emptyLabel?: string;

};



/**

 * StatusContainer — itera chips autoritativos e exibe placeholder visual.

 * Não conhece CombatEngine; só recebe a lista adaptada.

 */

export function renderStatusContainer(

  container: HTMLElement,

  statuses: readonly ActiveStatusChip[],

  options: StatusDisplayOptions = {},

): void {

  uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});

  container.replaceChildren();

  container.classList.toggle('status-container--empty', statuses.length === 0);



  if (statuses.length === 0) {

    if (options.emptyLabel) {

      const empty = container.ownerDocument.createElement('span');

      empty.className = 'status-container__empty';

      empty.textContent = options.emptyLabel;

      container.appendChild(empty);

    }

    return;

  }



  for (const chip of statuses) {

    container.appendChild(buildStatusChipElement(container.ownerDocument, chip));

  }

}



function bindStatusChipTooltip(el: HTMLElement, chip: ActiveStatusChip): void {

  const onEnter = (): void => {

    const rect = el.getBoundingClientRect();

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

  };



  const onLeave = (): void => {

    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});

  };



  el.addEventListener('mouseenter', onEnter);

  el.addEventListener('mouseleave', onLeave);

  el.addEventListener('focus', onEnter);

  el.addEventListener('blur', onLeave);

}



function buildStatusChipElement(doc: Document, chip: ActiveStatusChip): HTMLElement {

  const visual = resolveStatusVisual(chip.id);

  const el = doc.createElement('span');

  el.className = 'status-chip';

  el.dataset.statusId = chip.id;

  el.dataset.iconId = visual.iconId;

  el.style.setProperty('--status-color', visual.color);

  el.tabIndex = 0;

  el.setAttribute('role', 'img');

  el.setAttribute(

    'aria-label',

    `${resolveStatusTooltipAria(chip.id, chip.stacks, chip.turnsRemaining)}`,

  );



  const label = doc.createElement('span');

  label.className = 'status-chip__label';

  label.textContent = visual.label;

  el.appendChild(label);



  if (chip.stacks > 1) {

    const stacks = doc.createElement('span');

    stacks.className = 'status-chip__stacks';

    stacks.textContent = String(chip.stacks);

    el.appendChild(stacks);

  }



  if (visual.iconPath) {

    const img = doc.createElement('img');

    img.className = 'status-chip__icon';

    img.src = visual.iconPath;

    img.alt = '';

    el.prepend(img);

    label.classList.add('hidden');

  }



  bindStatusChipTooltip(el, chip);

  return el;

}



function resolveStatusTooltipAria(

  statusId: string,

  stacks: number,

  turnsRemaining: number,

): string {

  const visual = resolveStatusVisual(statusId);

  const parts = [visual.label, statusId.replace(/_/g, ' ').toLowerCase()];

  if (turnsRemaining > 0 && turnsRemaining < 999) {

    parts.push(`${turnsRemaining} turno(s) restante(s)`);

  }

  if (stacks > 1) {

    parts.push(`x${stacks}`);

  }

  return parts.join(', ');

}

