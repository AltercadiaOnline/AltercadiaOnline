import type { PlayerInspectView } from '../../shared/social/playerInspectTypes.js';

export type PlayerInspectHudState = {
  readonly view: PlayerInspectView | null;
  readonly screenX: number;
  readonly screenY: number;
  readonly pending: boolean;
  /** Esperando ACK de INSPECT_PLAYER — build/PvP ainda não são autoridade. */
  readonly loadingInspect: boolean;
  readonly error: string | null;
};

const listeners = new Set<() => void>();

let state: PlayerInspectHudState = {
  view: null,
  screenX: 0,
  screenY: 0,
  pending: false,
  loadingInspect: false,
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
  const width = 220;
  const estimatedHeight = 320;
  const pad = 10;
  const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 720 : window.innerHeight;
  return {
    x: Math.min(vw - pad - width / 2, Math.max(pad + width / 2, screenX)),
    y: Math.min(vh - pad, Math.max(pad + estimatedHeight, screenY)),
  };
}

function emptyPendingView(input: {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
}): PlayerInspectView {
  return {
    playerId: input.playerId,
    characterId: input.characterId,
    displayName: input.displayName,
    level: 1,
    classId: 'IMPETUS',
    online: true,
    build: { atk: 0, def: 0, crit: 0, agil: 0 },
    pvp: { rating: 0, wins: 0, losses: 0, matches: 0 },
    canAddFriend: false,
    canInviteDuel: false,
    duelInviteBlockReason: 'Carregando…',
    canTrade: false,
  };
}

/** Abre a ficha na hora do pick — nome do peer já veio do state-sync. Build/PvP vêm no ACK. */
export function openPlayerInspectHudPending(input: {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly screenX: number;
  readonly screenY: number;
}): void {
  const anchor = clampHudAnchor(input.screenX, input.screenY);
  state = {
    view: emptyPendingView(input),
    screenX: anchor.x,
    screenY: anchor.y,
    pending: false,
    loadingInspect: true,
    error: null,
  };
  notify();
}

export function openPlayerInspectHud(view: PlayerInspectView, screenX: number, screenY: number): void {
  const anchor = clampHudAnchor(screenX, screenY);
  state = {
    view,
    screenX: anchor.x,
    screenY: anchor.y,
    pending: false,
    loadingInspect: false,
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
    loadingInspect: false,
    error: null,
  };
  notify();
}

export function setPlayerInspectPending(pending: boolean, error: string | null = null): void {
  if (!state.view) return;
  state = { ...state, pending, error, loadingInspect: false };
  notify();
}

export function markPlayerInspectFriendSent(): void {
  const view = state.view;
  if (!view) return;
  state = {
    ...state,
    pending: false,
    loadingInspect: false,
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
    loadingInspect: false,
    error: null,
  };
  notify();
}
