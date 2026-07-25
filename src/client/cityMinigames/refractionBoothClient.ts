/**
 * Cabine de Refração — intents via ActionDispatcher (Local = Online).
 * Listeners recebem o mesmo shape dos antigos eventos WS.
 */

import type {
  RefractionBoothCompletePayload,
  RefractionBoothCompleteSuccess,
  RefractionBoothQuoteResult,
  RefractionBoothStarted,
} from '../../shared/cityMinigames/refractionBoothTypes.js';
import { getActionDispatcher } from '../ActionDispatcher.js';

export type RefractionBoothCredentials = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
};

export type RefractionBoothQuoteListener = (
  payload: RefractionBoothQuoteResult | { readonly ok: false; readonly reason: string },
) => void;

export type RefractionBoothStartedListener = (
  payload: RefractionBoothStarted | { readonly ok: false; readonly reason: string },
) => void;

export type RefractionBoothCompleteListener = (
  payload: RefractionBoothCompleteSuccess | { readonly ok: false; readonly reason: string },
) => void;

let credentials: RefractionBoothCredentials | null = null;
let quoteListener: RefractionBoothQuoteListener | null = null;
let startedListener: RefractionBoothStartedListener | null = null;
let completeListener: RefractionBoothCompleteListener | null = null;

export function setRefractionBoothCredentials(next: RefractionBoothCredentials | null): void {
  credentials = next;
}

/** @deprecated Compat — socket dedicado removido; usa player-intent. */
export function bindRefractionBoothSocket(_socket: unknown): void {
  /* no-op */
}

export function onRefractionBoothQuote(listener: RefractionBoothQuoteListener | null): void {
  quoteListener = listener;
}

export function onRefractionBoothStarted(listener: RefractionBoothStartedListener | null): void {
  startedListener = listener;
}

export function onRefractionBoothComplete(listener: RefractionBoothCompleteListener | null): void {
  completeListener = listener;
}

export function notifyRefractionBoothQuoteResult(
  payload: RefractionBoothQuoteResult | { readonly ok: false; readonly reason: string },
): void {
  quoteListener?.(payload);
}

export function notifyRefractionBoothStartedResult(
  payload: RefractionBoothStarted | { readonly ok: false; readonly reason: string },
): void {
  startedListener?.(payload);
}

export function notifyRefractionBoothCompleteResult(
  payload: RefractionBoothCompleteSuccess | { readonly ok: false; readonly reason: string },
): void {
  completeListener?.(payload);
}

export function requestRefractionBoothQuote(): boolean {
  if (!credentials) return false;
  const result = getActionDispatcher().dispatch({
    type: 'REFRACTION_BOOTH_QUOTE',
    payload: {},
  });
  return result.ok;
}

export function requestRefractionBoothStart(): boolean {
  if (!credentials) return false;
  const result = getActionDispatcher().dispatch({
    type: 'REFRACTION_BOOTH_START',
    payload: { displayName: credentials.displayName },
  });
  return result.ok;
}

export function requestRefractionBoothComplete(payload: RefractionBoothCompletePayload): boolean {
  if (!credentials) return false;
  const result = getActionDispatcher().dispatch({
    type: 'REFRACTION_BOOTH_COMPLETE',
    payload,
  });
  return result.ok;
}
