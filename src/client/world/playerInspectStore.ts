import type { PlayerInspectView } from '../../shared/social/playerInspectTypes.js';

export type PlayerInspectHudState = {
  readonly view: PlayerInspectView | null;
  readonly screenX: number;
  readonly screenY: number;
  readonly pending: boolean;
  readonly error: string | null;
};

const listeners = new Set<() => void>();

let state: PlayerInspectHudState = {
  view: null,
  screenX: 0,
  screenY: 0,
  pending: false,
  error: null,
};

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribePlayerInspectHud(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayerInspectHudState(): PlayerInspectHudState {
  return state;
}

function clampHudAnchor(screenX: number, screenY: number): { x: number; y: number } {
  const width = 196;
  const estimatedHeight = 220;
  const pad = 10;
  const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 720 : window.innerHeight;
  return {
    x: Math.min(vw - pad - width / 2, Math.max(pad + width / 2, screenX)),
    y: Math.min(vh - pad, Math.max(pad + estimatedHeight, screenY)),
  };
}

export function openPlayerInspectHud(view: PlayerInspectView, screenX: number, screenY: number): void {
  const anchor = clampHudAnchor(screenX, screenY);
  state = {
    view,
    screenX: anchor.x,
    screenY: anchor.y,
    pending: false,
    error: null,
  };
  notify();
}

export function closePlayerInspectHud(): void {
  if (!state.view) return;
  state = {
    view: null,
    screenX: 0,
    screenY: 0,
    pending: false,
    error: null,
  };
  notify();
}

export function setPlayerInspectPending(pending: boolean, error: string | null = null): void {
  if (!state.view) return;
  state = { ...state, pending, error };
  notify();
}

export function markPlayerInspectFriendSent(): void {
  const view = state.view;
  if (!view) return;
  state = {
    ...state,
    pending: false,
    error: null,
    view: { ...view, canAddFriend: false },
  };
  notify();
}

export function resetPlayerInspectSession(): void {
  state = {
    view: null,
    screenX: 0,
    screenY: 0,
    pending: false,
    error: null,
  };
  notify();
}
