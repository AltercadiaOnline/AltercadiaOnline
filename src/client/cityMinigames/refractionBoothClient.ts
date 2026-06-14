import type {
  RefractionBoothCompletePayload,
  RefractionBoothCompleteSuccess,
  RefractionBoothQuoteResult,
  RefractionBoothStarted,
} from '../../shared/cityMinigames/refractionBoothTypes.js';
import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';

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

const WS_OPEN = 1;

let activeSocket: BrowserCombatSocket | null = null;
let credentials: RefractionBoothCredentials | null = null;
let quoteListener: RefractionBoothQuoteListener | null = null;
let startedListener: RefractionBoothStartedListener | null = null;
let completeListener: RefractionBoothCompleteListener | null = null;
let bound = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function setRefractionBoothCredentials(next: RefractionBoothCredentials | null): void {
  credentials = next;
}

export function bindRefractionBoothSocket(socket: BrowserCombatSocket): void {
  activeSocket = socket;
  if (bound) return;
  bound = true;

  socket.on('refraction-booth-quote-result', (raw) => {
    if (!isRecord(raw)) return;
    quoteListener?.(raw as RefractionBoothQuoteResult | { ok: false; reason: string });
  });

  socket.on('refraction-booth-started', (raw) => {
    if (!isRecord(raw)) return;
    startedListener?.(raw as RefractionBoothStarted | { ok: false; reason: string });
  });

  socket.on('refraction-booth-complete-result', (raw) => {
    if (!isRecord(raw)) return;
    completeListener?.(raw as RefractionBoothCompleteSuccess | { ok: false; reason: string });
  });
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

export function requestRefractionBoothQuote(): boolean {
  if (!activeSocket || activeSocket.readyState !== WS_OPEN || !credentials) return false;
  activeSocket.send('refraction-booth-quote', {
    playerId: credentials.playerId,
    characterId: credentials.characterId,
  });
  return true;
}

export function requestRefractionBoothStart(): boolean {
  if (!activeSocket || activeSocket.readyState !== WS_OPEN || !credentials) return false;
  activeSocket.send('refraction-booth-start', {
    playerId: credentials.playerId,
    characterId: credentials.characterId,
    displayName: credentials.displayName,
  });
  return true;
}

export function requestRefractionBoothComplete(payload: RefractionBoothCompletePayload): boolean {
  if (!activeSocket || activeSocket.readyState !== WS_OPEN || !credentials) return false;
  activeSocket.send('refraction-booth-complete', {
    playerId: credentials.playerId,
    characterId: credentials.characterId,
    ...payload,
  });
  return true;
}
