import { getItemById } from '../../../shared/items/itemCatalog.js';

export const UNKNOWN_ITEM_ICON_PATH = '/assets/items/unknown.svg';

const boundFallbackRoots = new WeakSet<ParentNode>();

export const getItemIconPath = (itemId: string, customPath?: string): string => {
  if (customPath) return customPath;
  return `/assets/items/${itemId}.png`;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resolve src do ícone via catálogo; fallback quando itemId é inválido. */
export function resolveItemIconSrc(itemId: string): string {
  const item = getItemById(itemId);
  if (!item) return UNKNOWN_ITEM_ICON_PATH;
  return getItemIconPath(itemId, item.iconPath);
}

export type RenderItemIconOptions = {
  readonly className?: string;
  readonly unknownClassName?: string;
};

/**
 * HTML de ícone para listas longas — `loading="lazy"` + fallback delegado em erro de rede.
 */
export function renderItemIconHtml(
  itemId: string,
  options: RenderItemIconOptions = {},
): string {
  const className = options.className ?? 'item-icon';
  const unknownClassName = options.unknownClassName ?? 'item-icon--unknown';
  const src = resolveItemIconSrc(itemId);
  const isCatalogMiss = !getItemById(itemId);
  const itemName = getItemById(itemId)?.name ?? itemId;

  return `
    <img
      class="${escapeHtml(className)}${isCatalogMiss ? ` ${escapeHtml(unknownClassName)}` : ''}"
      src="${escapeHtml(src)}"
      alt=""
      width="32"
      height="32"
      loading="lazy"
      decoding="async"
      data-item-icon="true"
      data-item-id="${escapeHtml(itemId)}"
      aria-hidden="true"
      title="${escapeHtml(itemName)}"
    />
  `;
}

/** Delegação única por painel — troca src quebrado pelo ícone padrão sem N listeners. */
export function bindDelegatedItemIconFallback(root: ParentNode | null | undefined): void {
  if (!root || boundFallbackRoots.has(root)) return;
  boundFallbackRoots.add(root);

  root.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.itemIcon !== 'true') return;
    if (target.dataset.fallbackApplied === 'true') return;

    target.dataset.fallbackApplied = 'true';
    target.src = UNKNOWN_ITEM_ICON_PATH;
    target.classList.add('item-icon--unknown');
  }, true);
}
