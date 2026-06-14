import { ActionMenu } from './ActionMenu.js';
import {
  type ActionMenuContext,
  type ActionMenuItem,
  type ActionMenuKindResolver,
} from './actionMenuTypes.js';

export type ContextMenuContext = ActionMenuContext;
export type ContextMenuAction = ActionMenuItem;
export type ContextMenuKindResolver = ActionMenuKindResolver;

const CONTEXT_MENU_KIND_ATTR = 'data-context-menu-kind';
const CONTEXT_MENU_TARGET_ATTR = 'data-context-menu-target';
const LEGACY_KIND_ATTR = 'data-action-menu-kind';
const LEGACY_TARGET_ATTR = 'data-action-menu-target';

/**
 * Menu de contexto in-game — bloqueia o menu nativo e monta ações dinâmicas por alvo.
 */
export class ContextMenuService {
  private static instance: ContextMenuService | null = null;

  private readonly resolvers = new Map<string, ContextMenuKindResolver>();
  private activeMenu: ActionMenu | null = null;
  private teardownGlobal: (() => void) | null = null;

  static getInstance(): ContextMenuService {
    ContextMenuService.instance ??= new ContextMenuService();
    return ContextMenuService.instance;
  }

  registerKind(kind: string, resolver: ContextMenuKindResolver): () => void {
    this.resolvers.set(kind, resolver);
    return () => {
      if (this.resolvers.get(kind) === resolver) {
        this.resolvers.delete(kind);
      }
    };
  }

  resolveActions(context: ContextMenuContext): readonly ContextMenuAction[] {
    const resolver = this.resolvers.get(context.kind);
    if (!resolver) return [];
    return resolver(context);
  }

  open(context: ContextMenuContext): void {
    const actions = this.resolveActions(context);
    this.openWithActions(actions, context);
  }

  openWithActions(actions: readonly ContextMenuAction[], context: ContextMenuContext): void {
    this.close();
    if (actions.length === 0) return;

    const menu = new ActionMenu(actions, () => {
      if (this.activeMenu === menu) this.activeMenu = null;
    });
    this.activeMenu = menu;
    menu.open(context);
  }

  close(): void {
    this.activeMenu?.close();
    this.activeMenu = null;
  }

  isOpen(): boolean {
    return this.activeMenu !== null;
  }

  /** Bloqueia `contextmenu` globalmente; abre painel customizado em alvos declarativos. */
  installGlobalBlock(root: Document | HTMLElement = document): () => void {
    this.teardownGlobal?.();

    const doc = root instanceof Document ? root : root.ownerDocument ?? document;
    const view = doc.defaultView;
    if (!view) return () => undefined;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const targetEl = event.target instanceof Element
        ? event.target.closest(`[${CONTEXT_MENU_KIND_ATTR}], [${LEGACY_KIND_ATTR}]`)
        : null;
      if (!targetEl) return;

      const kind = targetEl.getAttribute(CONTEXT_MENU_KIND_ATTR)
        ?? targetEl.getAttribute(LEGACY_KIND_ATTR);
      if (!kind) return;

      this.open({
        kind,
        clientX: event.clientX,
        clientY: event.clientY,
        nativeEvent: event,
        target: readDeclaredTarget(targetEl),
      });
    };

    const onPointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!this.activeMenu) return;

      const target = event.target;
      if (target instanceof Element && target.closest('.action-menu__button')) {
        return;
      }

      this.close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };

    const onBlur = () => this.close();

    doc.addEventListener('contextmenu', onContextMenu, true);
    doc.addEventListener('mousedown', onPointerDown, true);
    doc.addEventListener('keydown', onKeyDown, true);
    view.addEventListener('blur', onBlur);

    this.teardownGlobal = () => {
      doc.removeEventListener('contextmenu', onContextMenu, true);
      doc.removeEventListener('mousedown', onPointerDown, true);
      doc.removeEventListener('keydown', onKeyDown, true);
      view.removeEventListener('blur', onBlur);
      this.teardownGlobal = null;
      this.close();
    };

    return this.teardownGlobal;
  }

  bindContextMenu(
    target: EventTarget,
    kind: string,
    resolveTarget?: (event: MouseEvent) => unknown,
  ): () => void {
    const handler = (event: Event) => {
      const mouse = event as MouseEvent;
      event.preventDefault();
      event.stopPropagation();
      this.open({
        kind,
        clientX: mouse.clientX,
        clientY: mouse.clientY,
        nativeEvent: mouse,
        target: resolveTarget?.(mouse),
      });
    };

    target.addEventListener('contextmenu', handler);
    return () => target.removeEventListener('contextmenu', handler);
  }

  destroy(): void {
    this.teardownGlobal?.();
    this.resolvers.clear();
    ContextMenuService.instance = null;
  }
}

function readDeclaredTarget(element: Element): unknown {
  const raw = element.getAttribute(CONTEXT_MENU_TARGET_ATTR)
    ?? element.getAttribute(LEGACY_TARGET_ATTR);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function getContextMenuService(): ContextMenuService {
  return ContextMenuService.getInstance();
}
