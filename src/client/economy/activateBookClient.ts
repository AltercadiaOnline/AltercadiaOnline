import { getActionDispatcher, type DispatchResult } from '../ActionDispatcher.js';
import { alertSystem } from '../ui/alertSystem.js';

function formatBookExpiry(expiresAtMs: number): string {
  const remainingMs = Math.max(0, expiresAtMs - Date.now());
  const minutes = Math.ceil(remainingMs / 60_000);
  return minutes > 0 ? `${minutes} min` : 'em breve';
}

/** Intenção autoritativa — player-intent ACTIVATE_BOOK. */
export function requestActivateBook(bookId: string): DispatchResult {
  const trimmed = bookId.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Livro inválido.' };
  }
  return getActionDispatcher().dispatch({
    type: 'ACTIVATE_BOOK',
    payload: { bookId: trimmed },
  });
}

export function notifyActivateBookIntentSuccess(
  bookId: string,
  expiresAt: number,
): void {
  alertSystem(`Livro "${bookId}" ativado (${formatBookExpiry(expiresAt)} restantes).`);
}
