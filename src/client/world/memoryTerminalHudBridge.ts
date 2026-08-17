const MEMORY_TERMINAL_CLOSE_GLOBAL_KEY = '__ALTERCADIA_MEMORY_TERMINAL_CLOSE__';

type GlobalWithMemoryTerminalClose = typeof globalThis & {
  [MEMORY_TERMINAL_CLOSE_GLOBAL_KEY]?: (() => void) | null;
};

function readCloseHandler(): (() => void) | null {
  return (globalThis as GlobalWithMemoryTerminalClose)[MEMORY_TERMINAL_CLOSE_GLOBAL_KEY] ?? null;
}

function writeCloseHandler(handler: (() => void) | null): void {
  (globalThis as GlobalWithMemoryTerminalClose)[MEMORY_TERMINAL_CLOSE_GLOBAL_KEY] = handler;
}

/**
 * Singleton entre main.js (tsc) e ui-runtime (esbuild).
 * O grafo vanilla de gameSession não pode importar o .tsx do overlay.
 */
export function registerMemoryTerminalHudCloser(handler: (() => void) | null): void {
  writeCloseHandler(handler);
}

/** ESC na exploração: fecha o terminal da zona 1 sem abrir o menu de pause. */
export function closeMemoryTerminalHud(): boolean {
  const handler = readCloseHandler();
  if (!handler) return false;
  handler();
  return true;
}
