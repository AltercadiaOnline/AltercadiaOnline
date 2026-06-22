import { registerEconomyAuditHook } from '../../Economy/economyAuditHook.js';
import { configureAuditLogger, scheduleEconomyAuditLog } from './auditLogger.js';

/** Liga EconomyGateway → auditLogger (somente runtime servidor). */
export function registerServerEconomyAudit(): void {
  configureAuditLogger();
  registerEconomyAuditHook(scheduleEconomyAuditLog);
}
