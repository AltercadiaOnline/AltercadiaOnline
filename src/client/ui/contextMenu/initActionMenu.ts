import { getContextMenuService } from './ContextMenuService.js';
import { registerDefaultActionMenuProviders } from './actionMenuProviders.js';

let teardownProviders: (() => void) | null = null;
let teardownGlobal: (() => void) | null = null;

/** Instala ContextMenuService — bloqueio do menu nativo + providers padrão. */
export function initContextMenuService(root: Document | HTMLElement = document): () => void {
  teardownContextMenuService();

  const service = getContextMenuService();
  teardownProviders = registerDefaultActionMenuProviders();
  teardownGlobal = service.installGlobalBlock(root);

  return teardownContextMenuService;
}

/** @deprecated Use `initContextMenuService`. */
export function initActionMenuSystem(root: Document | HTMLElement = document): () => void {
  return initContextMenuService(root);
}

export function teardownContextMenuService(): void {
  teardownGlobal?.();
  teardownGlobal = null;
  teardownProviders?.();
  teardownProviders = null;
  getContextMenuService().close();
}

/** @deprecated Use `teardownContextMenuService`. */
export function teardownActionMenuSystem(): void {
  teardownContextMenuService();
}