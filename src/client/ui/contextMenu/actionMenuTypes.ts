/** Item dinâmico — montado em runtime, sem ações fixas no menu. */
export type ActionMenuItem = {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean | ((context: ActionMenuContext) => boolean);
  readonly run: (context: ActionMenuContext) => void;
};

/** Contexto passado ao abrir o menu — define quais ações resolver. */
export type ActionMenuContext = {
  readonly kind: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly nativeEvent: MouseEvent;
  readonly target?: unknown;
};

export type ActionMenuKindResolver = (
  context: ActionMenuContext,
) => readonly ActionMenuItem[];

export function isActionMenuItemDisabled(
  item: ActionMenuItem,
  context: ActionMenuContext,
): boolean {
  if (typeof item.disabled === 'function') return item.disabled(context);
  return item.disabled === true;
}
