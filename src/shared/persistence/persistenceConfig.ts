/** Modo de persistência do servidor — MVP online. */
export const PersistenceMode = {
  /** Estado efêmero (dev local, testes unitários). */
  Memory: 'memory',
  /** JSON em disco — QA online e redeploy sem perder progresso. */
  File: 'file',
} as const;

export type PersistenceModeId = (typeof PersistenceMode)[keyof typeof PersistenceMode];

export function parsePersistenceMode(raw: string | undefined): PersistenceModeId {
  const value = raw?.trim().toLowerCase();
  if (value === PersistenceMode.File) return PersistenceMode.File;
  return PersistenceMode.Memory;
}
