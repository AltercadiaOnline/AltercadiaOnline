import type { ClientIntent } from '../../shared/intent/clientIntent.js';
import type { SecurityViolationCode } from '../middleware/securityGuard.js';

export type IntentValidationLogContext = {
  readonly connectionId: string;
  readonly intentId: string;
  readonly intentType: string;
  readonly intentPayload: unknown;
  readonly intentTimestamp?: number;
  readonly sessionPlayerId: string;
  readonly sessionCharacterId: number;
  readonly serverId: string;
};

function summarizePayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;

  const record = payload as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (/token|password|secret|authorization/i.test(key)) {
      summary[key] = '[redacted]';
      continue;
    }
    if (typeof value === 'string' && value.length > 200) {
      summary[key] = `${value.slice(0, 200)}…`;
      continue;
    }
    summary[key] = value;
  }

  return summary;
}

/** Log estruturado — intent rejeitado sem derrubar a conexão (exceto violações críticas). */
export function logRejectedPlayerIntent(
  reason: SecurityViolationCode | string,
  message: string,
  context: IntentValidationLogContext,
  options?: { readonly disconnect?: boolean },
): void {
  console.warn('[IntentValidation] Intenção rejeitada', {
    reason,
    message,
    disconnect: options?.disconnect ?? false,
    connectionId: context.connectionId,
    intentId: context.intentId,
    intentType: context.intentType,
    intentTimestamp: context.intentTimestamp ?? null,
    intentPayload: summarizePayload(context.intentPayload),
    session: {
      playerId: context.sessionPlayerId,
      characterId: context.sessionCharacterId,
      serverId: context.serverId,
    },
  });
}

export function buildIntentValidationContext(
  connectionId: string,
  world: { readonly playerId: string; readonly characterId: number },
  serverId: string,
  intent: Pick<ClientIntent, 'intentId' | 'correlationId' | 'type' | 'payload' | 'timestamp'>,
): IntentValidationLogContext {
  return {
    connectionId,
    intentId: intent.correlationId ?? intent.intentId,
    intentType: intent.type,
    intentPayload: intent.payload,
    intentTimestamp: intent.timestamp,
    sessionPlayerId: world.playerId,
    sessionCharacterId: world.characterId,
    serverId,
  };
}
