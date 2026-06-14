/** Modo de persistência do servidor — MVP online. */
export const PersistenceMode = {
  /** Estado efêmero (dev local, testes unitários). */
  Memory: 'memory',
  /** JSON em disco — QA online e redeploy sem perder progresso. */
  File: 'file',
  /** Postgres via pool `pg` — schema/SQL plugável futuramente. */
  Postgres: 'postgres',
} as const;

export type PersistenceModeId = (typeof PersistenceMode)[keyof typeof PersistenceMode];

export function parsePersistenceMode(raw: string | undefined): PersistenceModeId {
  const value = raw?.trim().toLowerCase();
  if (value === PersistenceMode.File) return PersistenceMode.File;
  if (value === PersistenceMode.Postgres) return PersistenceMode.Postgres;
  return PersistenceMode.Memory;
}

export function isDurablePersistenceMode(mode: PersistenceModeId): boolean {
  return mode === PersistenceMode.File || mode === PersistenceMode.Postgres;
}
