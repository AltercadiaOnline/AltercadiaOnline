/**
 * Nível do card no char select: file (após hydrate) ou profiles.level do Supabase.
 * Sem save em disco o default RAM level=1 não pode mascarar o perfil durável.
 */
export function resolveHubSlotLevel(
  hadPersistedSave: boolean,
  progressionLevel: number | undefined,
  profileLevel: number | undefined,
): number {
  if (hadPersistedSave) {
    const fromFile = typeof progressionLevel === 'number' && Number.isFinite(progressionLevel)
      ? Math.max(1, Math.floor(progressionLevel))
      : null;
    if (fromFile !== null) return fromFile;
  }
  const fromProfile = typeof profileLevel === 'number' && Number.isFinite(profileLevel)
    ? Math.max(1, Math.floor(profileLevel))
    : null;
  return fromProfile ?? 1;
}
