import type { EconomyAuditLogEntry } from '../shared/economy/economyAuditTypes.js';

type EconomyAuditSink = (entry: EconomyAuditLogEntry) => void;

let auditSink: EconomyAuditSink | null = null;

/** Registro no bootstrap do servidor — cliente/mock permanece no-op. */
export function registerEconomyAuditHook(sink: EconomyAuditSink): void {
  auditSink = sink;
}

export function resetEconomyAuditHookForTests(): void {
  auditSink = null;
}

export function buildEconomyAuditEntry(
  input: Omit<EconomyAuditLogEntry, 'timestamp'> & { readonly timestamp?: string },
): EconomyAuditLogEntry {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    userId: input.userId,
    action: input.action,
    itemId: input.itemId,
    quantity: Math.max(0, Math.floor(input.quantity)),
    reason: input.reason,
  };
}

/** Fire-and-forget — o sink decide persistência assíncrona. */
export function emitEconomyAuditLog(entry: EconomyAuditLogEntry): void {
  auditSink?.(entry);
}
