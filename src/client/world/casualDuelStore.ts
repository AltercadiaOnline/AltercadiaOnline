import { CasualDuelPhase } from '../../shared/social/casualDuelTypes.js';
import type { CasualDuelSnapshot } from '../../shared/social/casualDuelTypes.js';

export type CasualDuelHudState = {
  readonly snapshot: CasualDuelSnapshot | null;
};

const listeners = new Set<() => void>();

let state: CasualDuelHudState = { snapshot: null };
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeCasualDuelHud(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCasualDuelHudState(): CasualDuelHudState {
  return state;
}

export function applyCasualDuelSnapshot(snapshot: CasualDuelSnapshot): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  state = { snapshot };
  notify();
  if (snapshot.phase === CasualDuelPhase.Cancelled) {
    clearTimer = setTimeout(() => {
      clearTimer = null;
      clearCasualDuelHud();
    }, 2800);
  }
}

export function clearCasualDuelHud(): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  if (!state.snapshot) return;
  state = { snapshot: null };
  notify();
}

export function resetCasualDuelSession(): void {
  clearCasualDuelHud();
}

export function isCasualDuelPromptVisible(localPlayerId: string, snapshot: CasualDuelSnapshot | null): boolean {
  if (!snapshot || snapshot.phase !== CasualDuelPhase.Pending) return false;
  return snapshot.toPlayerId === localPlayerId;
}

export function isCasualDuelWaitingVisible(localPlayerId: string, snapshot: CasualDuelSnapshot | null): boolean {
  if (!snapshot || snapshot.phase !== CasualDuelPhase.Pending) return false;
  return snapshot.fromPlayerId === localPlayerId;
}

export function isCasualDuelCountdownVisible(snapshot: CasualDuelSnapshot | null): boolean {
  return snapshot?.phase === CasualDuelPhase.Countdown || snapshot?.phase === CasualDuelPhase.Starting;
}
