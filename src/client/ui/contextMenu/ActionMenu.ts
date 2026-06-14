import { escapeHtml } from '../battle/battleTerminalShared.js';
import {
  isActionMenuItemDisabled,
  type ActionMenuContext,
  type ActionMenuItem,
} from './actionMenuTypes.js';

export const ACTION_MENU_ROOT_CLASS = 'action-menu';
export const ACTION_MENU_HOST_ID = 'action-menu-host';

/**
 * Menu de ações montado dinamicamente — uma instância por abertura.
 * @example const menu = new ActionMenu([action1, action2]); menu.open(context);
 */
export class ActionMenu {
  private host: HTMLElement | null = null;
  private readonly onDismiss: (() => void) | null;
  private readonly actions: readonly ActionMenuItem[];

  constructor(actions: readonly ActionMenuItem[], onDismiss?: () => void) {
    this.actions = actions;
    this.onDismiss = onDismiss ?? null;
  }

  open(context: ActionMenuContext): void {
    this.close();

    if (this.actions.length === 0) return;

    const doc = document;
    const host = doc.createElement('div');
    host.id = ACTION_MENU_HOST_ID;
    host.className = `${ACTION_MENU_ROOT_CLASS}-host`;
    host.setAttribute('role', 'presentation');

    const menu = doc.createElement('nav');
    menu.className = `${ACTION_MENU_ROOT_CLASS} context-menu ui-panel ui-panel--context-menu`;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Menu de ações');

    const list = doc.createElement('ul');
    list.className = 'action-menu__list';

    for (const item of this.actions) {
      const disabled = isActionMenuItemDisabled(item, context);
      const li = doc.createElement('li');
      li.className = 'action-menu__item';
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'action-menu__button';
      btn.setAttribute('role', 'menuitem');
      btn.dataset.actionId = item.id;
      btn.disabled = disabled;
      btn.innerHTML = item.icon
        ? `<span class="action-menu__icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="action-menu__label">${escapeHtml(item.label)}</span>`
        : `<span class="action-menu__label">${escapeHtml(item.label)}</span>`;

      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (disabled) return;
        this.close();
        item.run(context);
      });

      li.appendChild(btn);
      list.appendChild(li);
    }

    menu.appendChild(list);
    host.appendChild(menu);
    doc.body.appendChild(host);
    this.host = host;

    this.positionMenu(menu, context.clientX, context.clientY);

    const firstEnabled = menu.querySelector<HTMLButtonElement>('.action-menu__button:not([disabled])');
    firstEnabled?.focus();
  }

  close(): void {
    this.host?.remove();
    this.host = null;
    this.onDismiss?.();
  }

  private positionMenu(menu: HTMLElement, clientX: number, clientY: number): void {
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;

    const rect = menu.getBoundingClientRect();
    const pad = 8;
    let x = clientX;
    let y = clientY;

    if (rect.right > window.innerWidth - pad) {
      x = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (rect.bottom > window.innerHeight - pad) {
      y = Math.max(pad, window.innerHeight - rect.height - pad);
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }
}

export function createActionMenu(actions: readonly ActionMenuItem[]): ActionMenu {
  return new ActionMenu(actions);
}
