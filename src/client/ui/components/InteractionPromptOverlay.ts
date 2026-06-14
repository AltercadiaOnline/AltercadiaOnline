import { positionElementAtBufferPoint } from '../../world/worldOverlayPosition.js';

type InteractionPromptOverlayOptions = {
  readonly host: HTMLElement;
  readonly onAccept: () => void;
  readonly onDismiss: () => void;
};
/**
 * Balão DOM de confirmação — só executa onInteract após aceite explícito.
 */
export class InteractionPromptOverlay {
  private readonly root: HTMLDivElement;
  private readonly labelEl: HTMLSpanElement;
  private readonly acceptButton: HTMLButtonElement;
  private visible = false;
  private readonly onDocumentMouseDown: (event: MouseEvent) => void;

  constructor(options: InteractionPromptOverlayOptions) {
    this.root = document.createElement('div');
    this.root.id = 'interaction-prompt';
    this.root.className = 'interaction-prompt hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-live', 'polite');

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'interaction-prompt__label';

    this.acceptButton = document.createElement('button');
    this.acceptButton.type = 'button';
    this.acceptButton.className = 'interaction-prompt__accept ui-interactive';
    this.acceptButton.textContent = 'Interagir';

    this.root.append(this.labelEl, this.acceptButton);
    options.host.append(this.root);

    this.acceptButton.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onAccept();
    });

    this.root.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    this.onDocumentMouseDown = (event: MouseEvent): void => {
      if (!this.visible) return;
      if (event.target instanceof Node && this.root.contains(event.target)) return;
      options.onDismiss();
    };
    document.addEventListener('mousedown', this.onDocumentMouseDown);
  }

  show(
    label: string,
    screenX: number,
    screenY: number,
    options?: { readonly acceptLabel?: string; readonly variant?: 'creature' | 'default' },
  ): void {
    this.labelEl.textContent = label;
    this.acceptButton.textContent = options?.acceptLabel ?? 'Interagir';
    this.root.classList.toggle('interaction-prompt--creature', options?.variant === 'creature');
    positionElementAtBufferPoint(this.root, screenX, screenY);
    this.root.classList.remove('hidden');
    this.visible = true;
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.root.classList.remove('interaction-prompt--creature');
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.root.remove();
  }
}
