type SpawnMirrorHandler = () => void;

let spawnHandler: SpawnMirrorHandler | null = null;

export function configureSpawnMirrorPlayer(handler: SpawnMirrorHandler | null): void {
  spawnHandler = handler;
}

/** Injeta bot espelho na batalha ativa (dev). */
export function spawnMirrorPlayer(): void {
  if (!spawnHandler) {
    console.warn('[Altercadia] spawnMirrorPlayer() — conecte-se ao servidor e entre em combate primeiro.');
    return;
  }
  spawnHandler();
  console.info('[Altercadia] Solicitando Player Espelho na batalha atual…');
}

declare global {
  interface Window {
    spawnMirrorPlayer?: () => void;
  }
}

export function installSpawnMirrorPlayerGlobal(): void {
  if (typeof window === 'undefined') return;
  window.spawnMirrorPlayer = spawnMirrorPlayer;
}
