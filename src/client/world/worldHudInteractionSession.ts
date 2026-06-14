import type { PlayerFacing } from '../../shared/world/playerFacing.js';

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

let activeSession: WorldHudInteractionSnapshot | null = null;

export function beginWorldHudInteractionSession(snapshot: WorldHudInteractionSnapshot): void {
  activeSession = { ...snapshot };
}

export function endWorldHudInteractionSession(): WorldHudInteractionSnapshot | null {
  const snapshot = activeSession;
  activeSession = null;
  return snapshot;
}

export function getWorldHudInteractionSession(): WorldHudInteractionSnapshot | null {
  return activeSession ? { ...activeSession } : null;
}

export function resolveWorldHudInteractionPose(
  session: WorldHudInteractionSnapshot,
): WorldHudInteractionPose {
  return session.pose ?? { x: session.x, y: session.y, facing: session.facing };
}

export function forceEndWorldHudInteractionSession(): void {
  activeSession = null;
}

export function isWorldHudInteractionLocked(): boolean {
  return activeSession !== null;
}
