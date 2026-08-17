import type { SprayInspectView } from '../../shared/social/spraySocialTypes.js';

export type SprayInspectHudState = {
  readonly view: SprayInspectView | null;
  readonly screenX: number;
  readonly screenY: number;
  readonly draft: string;
  readonly pending: boolean;
  readonly error: string | null;
};

const listeners = new Set<() => void>();

let state: SprayInspectHudState = {
  view: null,
  screenX: 0,
  screenY: 0,
  draft: '',
  pending: false,
  error: null,
};

let ownLegacyMessage = '';

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSprayInspectHud(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSprayInspectHudState(): SprayInspectHudState {
  return state;
}

export function getOwnSprayLegacyMessage(): string {
  return ownLegacyMessage;
}

export function setOwnSprayLegacyMessage(message: string): void {
  ownLegacyMessage = message;
  notify();
}

function clampSprayHudAnchor(screenX: number, screenY: number): { x: number; y: number } {
  const width = 176;
  const estimatedHeight = 172;
  const pad = 10;
  const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 720 : window.innerHeight;
  return {
    x: Math.min(vw - pad - width / 2, Math.max(pad + width / 2, screenX)),
    y: Math.min(vh - pad, Math.max(pad + estimatedHeight, screenY)),
  };
}

export function openSprayInspectHud(view: SprayInspectView, screenX: number, screenY: number): void {
  if (view.canEditLegacy) {
    ownLegacyMessage = view.author.legacyMessage;
  }
  const anchor = clampSprayHudAnchor(screenX, screenY);
  state = {
    view,
    screenX: anchor.x,
    screenY: anchor.y,
    draft: view.canEditLegacy ? view.author.legacyMessage : '',
    pending: false,
    error: null,
  };
  notify();
}

export function closeSprayInspectHud(): void {
  if (!state.view) return;
  state = {
    view: null,
    screenX: 0,
    screenY: 0,
    draft: '',
    pending: false,
    error: null,
  };
  notify();
}

export function setSprayInspectDraft(draft: string): void {
  state = { ...state, draft, error: null };
  notify();
}

export function setSprayInspectPending(pending: boolean, error: string | null = null): void {
  state = { ...state, pending, error };
  notify();
}

export function patchSprayInspectLegacy(legacyMessage: string): void {
  ownLegacyMessage = legacyMessage;
  const view = state.view;
  if (!view) {
    notify();
    return;
  }
  state = {
    ...state,
    draft: legacyMessage,
    pending: false,
    error: null,
    view: {
      ...view,
      author: { ...view.author, legacyMessage },
    },
  };
  notify();
}

export function markSprayInspectFriendSent(): void {
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

export function resetSprayInspectSession(): void {
  ownLegacyMessage = '';
  state = {
    view: null,
    screenX: 0,
    screenY: 0,
    draft: '',
    pending: false,
    error: null,
  };
  notify();
}
