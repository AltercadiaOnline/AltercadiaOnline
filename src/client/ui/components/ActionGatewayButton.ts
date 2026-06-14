import type { DispatchResult } from '../../ActionDispatcher.js';
import { getUIIntentStore } from '../intent/uiIntentStore.js';

const DEFAULT_PENDING_LABEL = 'Aguardando servidor…';

export type ActionGatewayButtonOptions = {
  /** Texto simples (ignorado se labelHtml / getLabelHtml / renderContent estiver definido). */
  readonly label?: string;
  /** HTML do botão em estado normal. */
  readonly labelHtml?: string;
  /** HTML dinâmico — útil quando o total/preço muda sem re-render completo. */
  readonly getLabelHtml?: () => string;
  readonly pendingLabel?: string;
  readonly pendingLabelHtml?: string;
  /** Controle total do conteúdo do botão (ex.: ícone + título + subtítulo). */
  readonly renderContent?: (button: HTMLButtonElement, pending: boolean) => void;
  /** Dispara a intenção via ActionDispatcher — retorne o DispatchResult. */
  readonly onClick: () => DispatchResult | void;
  /** Chamado quando o intentId deixa de estar pending (ack ou timeout). */
  readonly onResolved?: () => void;
  /** Elementos extras a desabilitar durante pending (ex.: input de quantidade). */
  readonly relatedElements?: () => readonly HTMLElement[];
};

export type ActionGatewayButtonHandle = {
  readonly element: HTMLButtonElement;
  destroy(): void;
  trackIntent(intentId: string | null): void;
  isInFlight(): boolean;
};

function extractPendingIntentId(result: DispatchResult | void): string | null {
  if (
    result
    && typeof result === 'object'
    && result.ok
    && result.status === 'pending'
    && 'intentId' in result
  ) {
    return result.intentId;
  }
  return null;
}

function applyButtonContent(
  button: HTMLButtonElement,
  pending: boolean,
  options: ActionGatewayButtonOptions,
): void {
  if (options.renderContent) {
    options.renderContent(button, pending);
    return;
  }

  if (pending) {
    if (options.pendingLabelHtml) {
      button.innerHTML = options.pendingLabelHtml;
      return;
    }
    button.textContent = options.pendingLabel ?? DEFAULT_PENDING_LABEL;
    return;
  }

  if (options.getLabelHtml) {
    button.innerHTML = options.getLabelHtml();
    return;
  }
  if (options.labelHtml) {
    button.innerHTML = options.labelHtml;
    return;
  }
  button.textContent = options.label ?? '';
}

function syncGatewayButton(
  button: HTMLButtonElement,
  trackedIntentId: string | null,
  options: ActionGatewayButtonOptions,
  onPendingCleared?: () => void,
): string | null {
  const store = getUIIntentStore();
  const wasPending = trackedIntentId !== null && store.isPending(trackedIntentId);
  const pending = wasPending;

  button.disabled = pending;
  if (pending) button.setAttribute('aria-busy', 'true');
  else button.removeAttribute('aria-busy');

  applyButtonContent(button, pending, options);

  for (const el of options.relatedElements?.() ?? []) {
    if ('disabled' in el) {
      (el as HTMLButtonElement | HTMLInputElement).disabled = pending;
    }
  }

  if (trackedIntentId !== null && !store.isPending(trackedIntentId)) {
    onPendingCleared?.();
    return null;
  }

  return trackedIntentId;
}

/**
 * Controlador reutilizável para painéis que re-renderizam via innerHTML.
 * Mantém o intentId entre renders e re-vincula o botão em afterRender().
 */
export class ActionGatewayButtonController {
  private button: HTMLButtonElement | null = null;
  private trackedIntentId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private clickHandler: (() => void) | null = null;

  constructor(
    private readonly resolveOptions: () => ActionGatewayButtonOptions,
  ) {}

  isInFlight(): boolean {
    return this.trackedIntentId !== null
      && getUIIntentStore().isPending(this.trackedIntentId);
  }

  /** Atributos para templates string-based (disabled + aria-busy). */
  busyAttrs(): string {
    return this.isInFlight() ? 'disabled aria-busy="true"' : '';
  }

  attach(button: HTMLButtonElement | null): void {
    this.detach();
    if (!button) return;

    this.button = button;
    const options = this.resolveOptions();
    const store = getUIIntentStore();

    const sync = (): void => {
      if (!this.button) return;
      const nextId = syncGatewayButton(
        this.button,
        this.trackedIntentId,
        this.resolveOptions(),
        () => this.resolveOptions().onResolved?.(),
      );
      if (nextId !== this.trackedIntentId) {
        this.trackedIntentId = nextId;
      }
    };

    this.clickHandler = (): void => {
      if (this.isInFlight()) return;

      const result = this.resolveOptions().onClick();
      const intentId = extractPendingIntentId(result);
      if (intentId) this.trackedIntentId = intentId;
      sync();
    };

    button.addEventListener('click', this.clickHandler);
    this.unsubscribe = store.subscribe(sync);
    sync();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.button && this.clickHandler) {
      this.button.removeEventListener('click', this.clickHandler);
    }
    this.clickHandler = null;
    this.button = null;
  }

  destroy(): void {
    this.detach();
    this.trackedIntentId = null;
  }

  trackIntent(intentId: string | null): void {
    this.trackedIntentId = intentId;
    if (this.button) {
      syncGatewayButton(
        this.button,
        this.trackedIntentId,
        this.resolveOptions(),
        () => this.resolveOptions().onResolved?.(),
      );
    }
  }
}

/** Cria um botão standalone (sem re-render do painel pai). */
export function createActionGatewayButton(
  options: ActionGatewayButtonOptions & { readonly className?: string },
): ActionGatewayButtonHandle {
  const store = getUIIntentStore();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className ?? 'action-gateway-button';

  let trackedIntentId: string | null = null;

  const sync = (): void => {
    trackedIntentId = syncGatewayButton(
      button,
      trackedIntentId,
      options,
      () => options.onResolved?.(),
    );
  };

  const onClick = (): void => {
    if (trackedIntentId !== null && store.isPending(trackedIntentId)) return;
    const result = options.onClick();
    const intentId = extractPendingIntentId(result);
    if (intentId) trackedIntentId = intentId;
    sync();
  };

  button.addEventListener('click', onClick);
  const unsubscribe = store.subscribe(sync);
  sync();

  return {
    element: button,
    destroy(): void {
      unsubscribe();
      button.removeEventListener('click', onClick);
    },
    trackIntent(intentId: string | null): void {
      trackedIntentId = intentId;
      sync();
    },
    isInFlight(): boolean {
      return trackedIntentId !== null && store.isPending(trackedIntentId);
    },
  };
}

/** Vincula pending state a um botão já presente no DOM. */
export function bindActionGatewayButton(
  button: HTMLButtonElement,
  options: ActionGatewayButtonOptions,
): () => void {
  const controller = new ActionGatewayButtonController(() => options);
  controller.attach(button);
  return () => controller.destroy();
}
