import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import { isWorldPanelOpen } from '../app/store/worldPanelsStore.js';
import { WORLD_HUD_LOCK_WINDOW_IDS } from './worldHudLockWindows.js';

export type WorldHudInteractionPose = {
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
};

export type WorldHudInteractionSnapshot = {
  /** Posição restaurada ao fechar a HUD. */
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
  /** Pose forçada enquanto a HUD está aberta (ex.: púlpito da arena). */
  readonly pose?: WorldHudInteractionPose;
};

const WORLD_HUD_SESSION_GLOBAL_KEY = '__ALTERCADIA_WORLD_HUD_INTERACTION_SESSION__';

type GlobalWithWorldHudSession = typeof globalThis & {
  [WORLD_HUD_SESSION_GLOBAL_KEY]?: WorldHudInteractionSnapshot | null;
};

/** Singleton entre main.js (tsc) e ui-runtime (esbuild) — evita trava permanente ao fechar HUD React. */
function readActiveSession(): WorldHudInteractionSnapshot | null {
  const snapshot = (globalThis as GlobalWithWorldHudSession)[WORLD_HUD_SESSION_GLOBAL_KEY];
  return snapshot ?? null;
}

function writeActiveSession(snapshot: WorldHudInteractionSnapshot | null): void {
  (globalThis as GlobalWithWorldHudSession)[WORLD_HUD_SESSION_GLOBAL_KEY] = snapshot;
}

export function beginWorldHudInteractionSession(snapshot: WorldHudInteractionSnapshot): void {
  writeActiveSession({ ...snapshot });
}

export function endWorldHudInteractionSession(): WorldHudInteractionSnapshot | null {
  const snapshot = readActiveSession();
  writeActiveSession(null);
  return snapshot ? { ...snapshot } : null;
}

export function getWorldHudInteractionSession(): WorldHudInteractionSnapshot | null {
  const snapshot = readActiveSession();
  return snapshot ? { ...snapshot } : null;
}

export function resolveWorldHudInteractionPose(
  session: WorldHudInteractionSnapshot,
): WorldHudInteractionPose {
  return session.pose ?? { x: session.x, y: session.y, facing: session.facing };
}

export function forceEndWorldHudInteractionSession(): void {
  writeActiveSession(null);
}

export function isWorldHudInteractionLocked(): boolean {
  return readActiveSession() !== null;
}

function hasOpenWorldHudLockPanel(): boolean {
  return WORLD_HUD_LOCK_WINDOW_IDS.some((windowId) => isWorldPanelOpen(windowId));
}

/**
 * Libera trava de exploração quando nenhuma HUD de NPC permanece aberta.
 * Chamada síncrona após closePanel — não depende do unmount do React.
 */
export function releaseWorldHudInteractionIfIdle(options?: { readonly defer?: boolean }): void {
  const run = (): void => {
    if (hasOpenWorldHudLockPanel()) return;
    if (!isWorldHudInteractionLocked()) return;

    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  };

  if (options?.defer) {
    queueMicrotask(run);
    return;
  }

  run();
}
