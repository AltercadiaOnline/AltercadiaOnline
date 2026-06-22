import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { EconomyAuditLogEntry } from '../../shared/economy/economyAuditTypes.js';
import { ensureDirectory } from '../persistence/DatabaseUtils.js';

const DEFAULT_AUDIT_DIR = path.resolve(process.cwd(), 'data', 'audit');
const AUDIT_FILENAME = 'economy-mutations.jsonl';

let auditFilePath = path.join(DEFAULT_AUDIT_DIR, AUDIT_FILENAME);
let writeChain: Promise<void> = Promise.resolve();

/** Permite override em testes ou via env futura (AUDIT_LOG_DIR). */
export function configureAuditLogger(options?: { readonly auditDir?: string }): void {
  const dir = options?.auditDir
    ?? (typeof process.env.AUDIT_LOG_DIR === 'string' && process.env.AUDIT_LOG_DIR.trim().length > 0
      ? path.resolve(process.env.AUDIT_LOG_DIR.trim())
      : DEFAULT_AUDIT_DIR);
  auditFilePath = path.join(dir, AUDIT_FILENAME);
}

export function getEconomyAuditLogPath(): string {
  return auditFilePath;
}

/**
 * Enfileira gravação assíncrona (JSONL append-only).
 * Separado de `data/characters/` — trilha de auditoria imutável por linha.
 */
export function scheduleEconomyAuditLog(entry: EconomyAuditLogEntry): void {
  writeChain = writeChain
    .then(() => persistAuditEntry(entry))
    .catch((error) => {
      console.error('[auditLogger] Falha ao gravar log de economia', {
        error,
        entry,
      });
    });
}

export async function flushAuditLogger(): Promise<void> {
  await writeChain;
}

async function persistAuditEntry(entry: EconomyAuditLogEntry): Promise<void> {
  await ensureDirectory(path.dirname(auditFilePath));
  const line = `${JSON.stringify(entry)}\n`;
  await appendFile(auditFilePath, line, 'utf8');
}
