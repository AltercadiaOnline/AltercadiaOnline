import type { ClientIntent } from '../../shared/intent/clientIntent.js';
import { validateIntentTimestamp } from '../../shared/intent/clientIntent.js';

export type IntentAcceptanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

const SEEN_TTL_MS = 120_000;
const seenBySession = new Map<string, Map<string, number>>();

function sessionKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function purgeExpired(seen: Map<string, number>, nowMs: number): void {
  for (const [intentId, seenAtMs] of seen) {
    if (nowMs - seenAtMs > SEEN_TTL_MS) {
      seen.delete(intentId);
    }
  }
}

function timestampFailureMessage(code: string): string {
  switch (code) {
    case 'STALE_INTENT':
      return 'Intenção expirada — reenvie a ação.';
    case 'FUTURE_INTENT':
      return 'Timestamp inválido no relógio do cliente.';
    default:
      return 'Timestamp de intenção inválido.';
  }
}

/** Valida timestamp e bloqueia reutilização do mesmo intentId na sessão. */
export function acceptClientIntent(
  playerId: string,
  characterId: number,
  intent: Pick<ClientIntent, 'intentId' | 'timestamp'>,
  nowMs: number = Date.now(),
): IntentAcceptanceResult {
  const timestampCheck = validateIntentTimestamp(intent.timestamp, nowMs);
  if (!timestampCheck.ok) {
    return {
      ok: false,
      code: timestampCheck.code,
      message: timestampFailureMessage(timestampCheck.code),
    };
  }

  const key = sessionKey(playerId, characterId);
  let seen = seenBySession.get(key);
  if (!seen) {
    seen = new Map();
    seenBySession.set(key, seen);
  }
  purgeExpired(seen, nowMs);

  if (seen.has(intent.intentId)) {
    return {
      ok: false,
      code: 'REPLAY_DETECTED',
      message: 'Intenção já processada.',
    };
  }

  seen.set(intent.intentId, nowMs);
  return { ok: true };
}

export function clearIntentReplaySession(playerId: string, characterId: number): void {
  seenBySession.delete(sessionKey(playerId, characterId));
}

export function resetIntentReplayGuard(): void {
  seenBySession.clear();
}
