/**
 * Dirty + revision para persistência de personagem (file/postgres).
 *
 * Padrão MMO: mutação em RAM marca dirty; I/O só no flush (debounce / intervalo /
 * logout). Skip se revision já persistida — evita write idêntico.
 */

export type CharacterPersistDirtyReason =
  | 'world'
  | 'economy'
  | 'progression'
  | 'combat'
  | 'portal'
  | 'loot'
  | 'manual';

/** Motivos que sempre gravam (segurança de sessão). */
export type CharacterPersistForceReason =
  | 'disconnect'
  | 'logout'
  | 'shutdown'
  | 'login'
  | 'marketplace';

type DirtyEntry = {
  dirtyRevision: number;
  lastPersistedRevision: number;
  lastReason: CharacterPersistDirtyReason | CharacterPersistForceReason;
};

const entries = new Map<string, DirtyEntry>();

function keyOf(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function getOrCreate(playerId: string, characterId: number): DirtyEntry {
  const key = keyOf(playerId, characterId);
  let entry = entries.get(key);
  if (!entry) {
    entry = { dirtyRevision: 0, lastPersistedRevision: 0, lastReason: 'manual' };
    entries.set(key, entry);
  }
  return entry;
}

/** Marca personagem sujo — barato; não dispara I/O. */
export function markCharacterPersistenceDirty(
  playerId: string,
  characterId: number,
  reason: CharacterPersistDirtyReason = 'manual',
): number {
  const entry = getOrCreate(playerId, characterId);
  entry.dirtyRevision += 1;
  entry.lastReason = reason;
  return entry.dirtyRevision;
}

export function isCharacterPersistenceDirty(
  playerId: string,
  characterId: number,
): boolean {
  const entry = entries.get(keyOf(playerId, characterId));
  if (!entry) return false;
  return entry.dirtyRevision > entry.lastPersistedRevision;
}

export function getCharacterPersistenceDirtyRevision(
  playerId: string,
  characterId: number,
): number {
  return entries.get(keyOf(playerId, characterId))?.dirtyRevision ?? 0;
}

/**
 * Após save OK — alinha revision persistida à dirty atual.
 * Se houve nova mutação durante o I/O, dirty continua true.
 */
export function acknowledgeCharacterPersistenceSaved(
  playerId: string,
  characterId: number,
  savedRevision: number,
): void {
  const entry = getOrCreate(playerId, characterId);
  entry.lastPersistedRevision = Math.max(entry.lastPersistedRevision, savedRevision);
  if (entry.dirtyRevision < entry.lastPersistedRevision) {
    entry.dirtyRevision = entry.lastPersistedRevision;
  }
}

/** Após hydrate do disco — estado limpo (espelha o que está no storage). */
export function resetCharacterPersistenceDirtyAfterHydrate(
  playerId: string,
  characterId: number,
): void {
  const entry = getOrCreate(playerId, characterId);
  entry.lastPersistedRevision = entry.dirtyRevision;
  entry.lastReason = 'manual';
}

export function clearCharacterPersistenceDirty(
  playerId: string,
  characterId: number,
): void {
  entries.delete(keyOf(playerId, characterId));
}

export function isForcePersistReason(reason: string | undefined): boolean {
  return (
    reason === 'disconnect'
    || reason === 'logout'
    || reason === 'shutdown'
    || reason === 'login'
    || reason === 'marketplace'
  );
}

/** Testes. */
export function resetCharacterPersistenceDirtyStore(): void {
  entries.clear();
}
