/** Tipos de mensagem do canal de sistema — nunca vão para o ChatGlobal. */
export const SystemMessageKind = {
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
  SYSTEM_TIP: 'SYSTEM_TIP',
} as const;

export type SystemMessageKind = (typeof SystemMessageKind)[keyof typeof SystemMessageKind];

export type LogServicePriority = 'normal' | 'high';

export type LogServicePayload = {
  readonly kind: SystemMessageKind;
  readonly message: string;
  readonly ts: number;
  /** `high` — exibe toast mesmo com o painel de log recolhido/oculto. */
  readonly priority?: LogServicePriority;
};

export function isSystemMessageKind(value: unknown): value is SystemMessageKind {
  return value === SystemMessageKind.SYSTEM_NOTIFICATION || value === SystemMessageKind.SYSTEM_TIP;
}

export function isLogServicePayload(value: unknown): value is LogServicePayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!isSystemMessageKind(record.kind)) return false;
  if (typeof record.message !== 'string' || record.message.length === 0) return false;
  if (typeof record.ts !== 'number' || !Number.isFinite(record.ts)) return false;
  if (
    record.priority !== undefined
    && record.priority !== 'normal'
    && record.priority !== 'high'
  ) {
    return false;
  }
  return true;
}

export function createLogServicePayload(
  kind: SystemMessageKind,
  message: string,
  priority: LogServicePriority = 'normal',
): LogServicePayload {
  return {
    kind,
    message: message.trim(),
    ts: Date.now(),
    priority,
  };
}

/** Mensagens de sistema nunca devem ser roteadas ao chat global. */
export function isRoutableToLogService(kind: string): boolean {
  return kind === SystemMessageKind.SYSTEM_NOTIFICATION || kind === SystemMessageKind.SYSTEM_TIP;
}
