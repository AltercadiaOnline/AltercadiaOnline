import { TradePhase } from '../../shared/social/playerTradeTypes.js';
import type { TradeSnapshot } from '../../shared/social/playerTradeTypes.js';

export type PlayerTradeHudState = {
  readonly snapshot: TradeSnapshot | null;
  readonly pending: boolean;
  readonly error: string | null;
};

const listeners = new Set<() => void>();

let state: PlayerTradeHudState = { snapshot: null, pending: false, error: null };
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribePlayerTradeHud(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayerTradeHudState(): PlayerTradeHudState {
  return state;
}

export function applyPlayerTradeSnapshot(snapshot: TradeSnapshot): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  state = { snapshot, pending: false, error: null };
  notify();
  if (snapshot.phase === TradePhase.Cancelled || snapshot.phase === TradePhase.Committed) {
    clearTimer = setTimeout(() => {
      clearTimer = null;
      clearPlayerTradeHud();
    }, snapshot.phase === TradePhase.Committed ? 1600 : 2800);
  }
}

export function setPlayerTradePending(pending: boolean, error: string | null = null): void {
  if (!state.snapshot) return;
  state = { ...state, pending, error };
  notify();
}

export function clearPlayerTradeHud(): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  if (!state.snapshot && !state.pending) return;
  state = { snapshot: null, pending: false, error: null };
  notify();
}

export function resetPlayerTradeSession(): void {
  clearPlayerTradeHud();
}

export function isTradePromptVisible(localPlayerId: string, snapshot: TradeSnapshot | null): boolean {
  if (!snapshot || snapshot.phase !== TradePhase.Pending) return false;
  return snapshot.to.playerId === localPlayerId;
}

export function isTradeWaitingVisible(localPlayerId: string, snapshot: TradeSnapshot | null): boolean {
  if (!snapshot || snapshot.phase !== TradePhase.Pending) return false;
  return snapshot.from.playerId === localPlayerId;
}

export function isTradeTableVisible(snapshot: TradeSnapshot | null): boolean {
  return snapshot?.phase === TradePhase.Open || snapshot?.phase === TradePhase.Committing;
}
