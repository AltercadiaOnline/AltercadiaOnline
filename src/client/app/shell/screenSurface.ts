/** Feature flags da camada screen (login / char select). Desligadas por padrão — legado HTML ativo. */
export function isReactAuthScreenEnabled(): boolean {
  return document.body.dataset.reactAuthUi === '1';
}

export function isReactCharSelectScreenEnabled(): boolean {
  return document.body.dataset.reactCharSelectUi === '1';
}

export function isReactScreenSurfaceActive(): boolean {
  return isReactAuthScreenEnabled() || isReactCharSelectScreenEnabled();
}

export function enableReactAuthScreen(): void {
  document.body.dataset.reactAuthUi = '1';
}

export function enableReactCharSelectScreen(): void {
  document.body.dataset.reactCharSelectUi = '1';
}
