import type { DraggablePanelController } from './panelDrag.js';
import { attachDraggablePanel } from './panelDrag.js';
import { attachHudDynamicLayout } from './layout/hudDynamicLayout.js';

/** Contrato base para todas as janelas HUD (Hub, Inventário, Mercado…). */
export interface UIComponent {
  readonly id: string;
  mount(parent: HTMLElement): void;
  render(): void;
  open(): void;
  close(): void;
  destroy(): void;
  isOpen(): boolean;
  isMovablePanel(): boolean;
  getRootElement(): HTMLElement | null;
  /** Traz a janela para frente sem fechar outras HUDs. */
  focus(): void;
}

export type UIComponentOptions = {
  readonly id: string;
  readonly rootClassName?: string;
  readonly interactiveClassName?: string;
  /** Janelas HUD arrastáveis pelo header (padrão: true). */
  readonly movable?: boolean;
};

/**
 * Implementação base: monta template, controla visibilidade (display:none)
 * e aplica pointer-events apenas quando aberto.
 */
export abstract class BaseUIComponent implements UIComponent {
  readonly id: string;
  protected root: HTMLElement | null = null;
  protected openState = false;
  private readonly rootClassName: string;
  private readonly interactiveClassName: string;
  private readonly movable: boolean;
  private drag: DraggablePanelController | null = null;
  private layoutDisposer: (() => void) | null = null;

  constructor(options: UIComponentOptions) {
    this.id = options.id;
    this.rootClassName = options.rootClassName ?? 'ui-panel';
    this.interactiveClassName = options.interactiveClassName ?? 'ui-interactive';
    this.movable = options.movable ?? true;
  }

  mount(parent: HTMLElement): void {
    if (this.root) return;
    this.root = this.createRoot();
    this.applyClassTokens(this.root, this.rootClassName);
    this.root.classList.add('ui-panel--closed');
    this.root.dataset.uiPanel = this.id;
    this.root.setAttribute('hidden', '');
    parent.appendChild(this.root);
    this.bindEvents();
    this.render();
    if (this.movable) {
      this.drag = attachDraggablePanel(this.root, parent, {
        panelId: this.id,
        handleSelector: '[data-panel-drag-handle], .ui-panel__header',
      });
    }
  }

  abstract createTemplate(): string;
  protected bindEvents(): void {}
  protected onOpen(): void {}
  protected onClose(): void {}

  render(): void {
    if (!this.root) return;
    this.root.innerHTML = this.createTemplate();
    this.afterRender();
    this.scheduleDynamicLayout();
  }

  protected afterRender(): void {}

  /** Reaplica auto-escala após render — HUDs horizontais sem scroll. */
  protected scheduleDynamicLayout(): void {
    if (!this.root || !this.openState || !this.shouldUseDynamicLayout()) return;
    requestAnimationFrame(() => {
      if (!this.root || !this.openState) return;
      this.layoutDisposer?.();
      this.layoutDisposer = attachHudDynamicLayout(this.root, this.getDynamicLayoutOptions());
    });
  }

  protected shouldUseDynamicLayout(): boolean {
    if (!this.root) return false;
    return (
      this.movable ||
      this.root.classList.contains('ui-panel--dialogue-cael') ||
      this.root.classList.contains('ui-panel--inventory') ||
      this.root.classList.contains('ui-panel--market') ||
      this.root.classList.contains('ui-panel--market-hub') ||
      this.root.classList.contains('ui-panel--vendor-shop') ||
      this.root.classList.contains('ui-panel--social') ||
      this.root.classList.contains('ui-panel--pet-love') ||
      this.root.classList.contains('ui-panel--marcos')
    );
  }

  protected getDynamicLayoutOptions(): import('./layout/hudDynamicLayout.js').HudDynamicLayoutOptions {
    return {};
  }

  open(): void {
    this.revealPanel();
  }

  /** Abre painel montado em host React — contorna overrides de `open()`. */
  openInHost(): void {
    this.revealPanel();
  }

  focus(): void {
    if (!this.root || !this.openState) return;
    this.drag?.bringToFront();
  }

  close(): void {
    this.concealPanel();
  }

  closeInHost(): void {
    this.concealPanel();
  }

  protected revealPanel(): void {
    if (!this.root) return;
    if (this.openState) {
      this.focus();
      return;
    }
    this.openState = true;
    this.root.removeAttribute('hidden');
    this.root.classList.remove('ui-panel--closed');
    this.root.classList.add('ui-panel--open');
    this.applyClassTokens(this.root, this.interactiveClassName);
    this.drag?.ensureDefaultPosition();
    this.drag?.bringToFront();
    this.onOpen();
    this.scheduleDynamicLayout();
  }

  protected concealPanel(): void {
    if (!this.root || !this.openState) return;
    this.layoutDisposer?.();
    this.layoutDisposer = null;
    this.openState = false;
    this.root.setAttribute('hidden', '');
    this.root.classList.add('ui-panel--closed');
    this.root.classList.remove('ui-panel--open');
    this.removeClassTokens(this.root, this.interactiveClassName);
    this.onClose();
  }

  isOpen(): boolean {
    return this.openState;
  }

  isMovablePanel(): boolean {
    return this.movable;
  }

  getRootElement(): HTMLElement | null {
    return this.root;
  }

  destroy(): void {
    this.layoutDisposer?.();
    this.layoutDisposer = null;
    this.close();
    this.drag?.dispose();
    this.drag = null;
    this.root?.remove();
    this.root = null;
  }

  protected query<T extends Element>(selector: string): T | null {
    return this.root?.querySelector<T>(selector) ?? null;
  }

  private createRoot(): HTMLElement {
    const el = document.createElement('div');
    el.id = `ui-panel-${this.id}`;
    return el;
  }

  private applyClassTokens(element: HTMLElement, classNames: string): void {
    for (const token of classNames.split(/\s+/)) {
      if (token) element.classList.add(token);
    }
  }

  private removeClassTokens(element: HTMLElement, classNames: string): void {
    for (const token of classNames.split(/\s+/)) {
      if (token) element.classList.remove(token);
    }
  }
}
