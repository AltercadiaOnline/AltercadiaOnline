/**
 * Contrato para recursos que registram listeners (DOM, WebSocket, stores).
 * Todo módulo que faz attach deve expor dispose() simétrico.
 */
export interface Disposable {
  dispose(): void;
}

export function disposeAll(...targets: readonly (Disposable | null | undefined)[]): void {
  for (const target of targets) {
    target?.dispose();
  }
}
