/** Camada screen (login / char select) — sempre React em online-react-v1. */
export function isReactAuthScreenEnabled(): boolean {
  return true;
}

export function isReactCharSelectScreenEnabled(): boolean {
  return true;
}

export function isReactScreenSurfaceActive(): boolean {
  return true;
}

/** @deprecated No-op — screen React é padrão oficial. */
export function enableReactAuthScreen(): void {
  /* noop */
}

/** @deprecated No-op — screen React é padrão oficial. */
export function enableReactCharSelectScreen(): void {
  /* noop */
}

export function markReactScreenRuntimeReady(ready: boolean): void {
  if (ready) {
    document.body.dataset.reactScreenReady = '1';
    return;
  }
  delete document.body.dataset.reactScreenReady;
}
