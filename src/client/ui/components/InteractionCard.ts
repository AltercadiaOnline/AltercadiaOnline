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
};

type InteractionCardButton = {
  readonly action: InteractionCardNpcAction | InteractionCardPlayerAction;
  readonly label: string;
  readonly disabled?: boolean;
};

/**
 * Card de ações por clique duplo — substitui context menu em entidades do mundo.
 */
export class InteractionCard {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLSpanElement;
  private readonly typeEl: HTMLSpanElement;
  private readonly actionsEl: HTMLDivElement;
  private readonly options: InteractionCardOptions;
  private target: InteractionCardTarget | null = null;
  private visible = false;
  private readonly onDocumentMouseDown: (event: MouseEvent) => void;

  constructor(options: InteractionCardOptions) {
    this.options = options;

    this.root = document.createElement('div');
    this.root.id = 'interaction-card';
    this.root.className = 'interaction-card hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-live', 'polite');

    const header = document.createElement('header');
    header.className = 'interaction-card__header';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'interaction-card__title';

    this.typeEl = document.createElement('span');
    this.typeEl.className = 'interaction-card__type';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'interaction-card__close ui-interactive';
    closeButton.setAttribute('aria-label', 'Fechar');
    closeButton.textContent = '×';

    header.append(this.titleEl, this.typeEl, closeButton);

    this.actionsEl = document.createElement('div');
    this.actionsEl.className = 'interaction-card__actions';

    this.root.append(header, this.actionsEl);
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

    this.onDocumentMouseDown = (event: MouseEvent): void => {
      if (!this.visible) return;
      if (event.target instanceof Node && this.root.contains(event.target)) return;
      this.hide();
      options.onDismiss();
    };
    document.addEventListener('mousedown', this.onDocumentMouseDown);
  }

  open(target: InteractionCardTarget): void {
    this.target = target;
    this.titleEl.textContent = target.displayName;
    this.typeEl.textContent = target.targetType === TargetType.NPC ? 'NPC' : 'Jogador';
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
    this.root.classList.add('hidden');
    this.visible = false;
    this.target = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.root.remove();
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
    return [
      { action: 'talk', label: 'Conversar' },
      { action: 'buy', label: 'Comprar', disabled: !canBuy },
    ];
  }

  private buildPlayerButtons(): InteractionCardButton[] {
    return [
      { action: 'duel', label: 'Duelo' },
      { action: 'trade', label: 'Trade' },
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
