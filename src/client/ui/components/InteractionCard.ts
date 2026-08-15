import { INTERACTION_PROMPT_BUFFER_OFFSET_Y } from '../../layout/UIConstants.js';
import { positionElementAtBufferPoint } from '../../world/worldOverlayPosition.js';
import type {
  InteractionCardNpcAction,
  InteractionCardPlayerAction,
  InteractionCardTarget,
  InteractionTargetType,
} from '../../../shared/world/interactionCardTypes.js';
import { InteractionTargetType as TargetType } from '../../../shared/world/interactionCardTypes.js';

export type InteractionCardActionPayload =
  | { readonly targetType: typeof TargetType.NPC; readonly action: InteractionCardNpcAction }
  | { readonly targetType: typeof TargetType.PLAYER; readonly action: InteractionCardPlayerAction };

export type InteractionCardOptions = {
  readonly host: HTMLElement;
  readonly onAction: (
    target: InteractionCardTarget,
    payload: InteractionCardActionPayload,
  ) => void;
  readonly onDismiss: () => void;
  readonly npcSupportsShop?: (targetId: string) => boolean;
  readonly npcShopActionLabel?: (targetId: string) => string;
};

type InteractionCardButton = {
  readonly action: InteractionCardNpcAction | InteractionCardPlayerAction;
  readonly label: string;
  readonly disabled?: boolean;
};

/**
 * Card de ações por clique duplo — NPC (âncora no alvo) ou jogador (HUD móvel).
 */
export class InteractionCard {
  private readonly root: HTMLDivElement;
  private readonly headerEl: HTMLElement;
  private readonly titleEl: HTMLSpanElement;
  private readonly typeEl: HTMLSpanElement;
  private readonly actionsEl: HTMLDivElement;
  private readonly options: InteractionCardOptions;
  private target: InteractionCardTarget | null = null;
  private visible = false;
  private freePositioned = false;
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private readonly onDocumentMouseDown: (event: MouseEvent) => void;
  private readonly onDragMove: (event: MouseEvent) => void;
  private readonly onDragEnd: () => void;

  constructor(options: InteractionCardOptions) {
    this.options = options;

    this.root = document.createElement('div');
    this.root.id = 'interaction-card';
    this.root.className = 'interaction-card hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-live', 'polite');

    this.headerEl = document.createElement('header');
    this.headerEl.className = 'interaction-card__header';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'interaction-card__title';

    this.typeEl = document.createElement('span');
    this.typeEl.className = 'interaction-card__type';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'interaction-card__close ui-interactive';
    closeButton.setAttribute('aria-label', 'Fechar');
    closeButton.textContent = '×';

    this.headerEl.append(this.titleEl, this.typeEl, closeButton);

    this.actionsEl = document.createElement('div');
    this.actionsEl.className = 'interaction-card__actions';

    this.root.append(this.headerEl, this.actionsEl);
    options.host.append(this.root);

    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.hide();
      options.onDismiss();
    });

    this.actionsEl.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-card-action]');
      if (!button || button.disabled || !this.target) return;
      event.stopPropagation();

      const action = button.dataset.cardAction;
      if (!action) return;

      const payload = this.resolveActionPayload(this.target.targetType, action);
      if (!payload) return;

      this.hide();
      options.onAction(this.target, payload);
    });

    this.root.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    this.headerEl.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || !this.target || this.target.targetType !== TargetType.PLAYER) return;
      if ((event.target as HTMLElement).closest('.interaction-card__close')) return;
      event.preventDefault();
      event.stopPropagation();
      this.beginDrag(event.clientX, event.clientY);
    });

    this.onDragMove = (event: MouseEvent): void => {
      if (!this.dragging) return;
      this.placeFree(event.clientX - this.dragOffsetX, event.clientY - this.dragOffsetY);
    };

    this.onDragEnd = (): void => {
      if (!this.dragging) return;
      this.dragging = false;
      this.root.classList.remove('interaction-card--dragging');
      window.removeEventListener('mousemove', this.onDragMove);
      window.removeEventListener('mouseup', this.onDragEnd);
    };

    this.onDocumentMouseDown = (event: MouseEvent): void => {
      if (!this.visible || this.dragging) return;
      // Card de player permanece aberto (móvel) até o alvo sair da tela / fechar.
      if (this.target?.targetType === TargetType.PLAYER) return;
      if (event.target instanceof Node && this.root.contains(event.target)) return;
      this.hide();
      options.onDismiss();
    };
    document.addEventListener('mousedown', this.onDocumentMouseDown);
  }

  open(target: InteractionCardTarget): void {
    this.target = target;
    this.freePositioned = false;
    this.titleEl.textContent = target.displayName;
    this.typeEl.textContent = target.targetType === TargetType.NPC ? 'NPC' : 'Jogador';
    this.root.classList.toggle('interaction-card--player', target.targetType === TargetType.PLAYER);
    this.root.classList.remove('interaction-card--free', 'interaction-card--dragging');
    this.renderActions(target);
    positionElementAtBufferPoint(
      this.root,
      target.screenX,
      target.screenY - INTERACTION_PROMPT_BUFFER_OFFSET_Y,
    );
    this.root.classList.remove('hidden');
    this.visible = true;
  }

  hide(): void {
    this.onDragEnd();
    this.root.classList.add('hidden');
    this.root.classList.remove('interaction-card--player', 'interaction-card--free', 'interaction-card--dragging');
    this.visible = false;
    this.freePositioned = false;
    this.target = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getTarget(): InteractionCardTarget | null {
    return this.target;
  }

  dispose(): void {
    this.onDragEnd();
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.root.remove();
  }

  private beginDrag(clientX: number, clientY: number): void {
    const rect = this.root.getBoundingClientRect();
    this.dragOffsetX = clientX - rect.left;
    this.dragOffsetY = clientY - rect.top;
    this.dragging = true;
    this.root.classList.add('interaction-card--dragging', 'interaction-card--free');
    this.freePositioned = true;
    this.placeFree(rect.left, rect.top);
    window.addEventListener('mousemove', this.onDragMove);
    window.addEventListener('mouseup', this.onDragEnd);
  }

  private placeFree(leftPx: number, topPx: number): void {
    const maxLeft = Math.max(0, window.innerWidth - this.root.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - this.root.offsetHeight);
    this.root.style.left = `${Math.max(0, Math.min(leftPx, maxLeft))}px`;
    this.root.style.top = `${Math.max(0, Math.min(topPx, maxTop))}px`;
  }

  private renderActions(target: InteractionCardTarget): void {
    const buttons = target.targetType === TargetType.NPC
      ? this.buildNpcButtons(target.targetId)
      : this.buildPlayerButtons();

    this.actionsEl.replaceChildren(
      ...buttons.map((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'interaction-card__action ui-interactive';
        button.dataset.cardAction = entry.action;
        button.textContent = entry.label;
        if (entry.disabled) button.disabled = true;
        return button;
      }),
    );
  }

  private buildNpcButtons(targetId: string): InteractionCardButton[] {
    const canBuy = this.options.npcSupportsShop?.(targetId) ?? false;
    const buyLabel = this.options.npcShopActionLabel?.(targetId) ?? 'Comprar';
    return [
      { action: 'talk', label: 'Conversar' },
      { action: 'buy', label: buyLabel, disabled: !canBuy },
    ];
  }

  private buildPlayerButtons(): InteractionCardButton[] {
    return [
      { action: 'trade', label: 'Trade' },
      { action: 'duel', label: 'PvP' },
      { action: 'follow', label: 'Seguir' },
    ];
  }

  private resolveActionPayload(
    targetType: InteractionTargetType,
    action: string,
  ): InteractionCardActionPayload | null {
    if (targetType === TargetType.NPC && (action === 'talk' || action === 'buy')) {
      return { targetType: TargetType.NPC, action };
    }
    if (targetType === TargetType.PLAYER && (action === 'duel' || action === 'trade' || action === 'follow')) {
      return { targetType: TargetType.PLAYER, action };
    }
    return null;
  }
}
