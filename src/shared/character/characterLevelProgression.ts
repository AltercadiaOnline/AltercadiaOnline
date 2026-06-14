import { CharacterProgressionService, PROGRESSION_XP_BASE, PROGRESSION_XP_GROWTH } from '../progression/CharacterProgressionService.js';

/** @deprecated Use `PROGRESSION_XP_BASE` — alias de compatibilidade. */
export const CHARACTER_XP_BASE = PROGRESSION_XP_BASE;

/** @deprecated Use `PROGRESSION_XP_GROWTH` — alias de compatibilidade. */
export const CHARACTER_XP_GROWTH = PROGRESSION_XP_GROWTH;

export type CharacterLevelState = {
  readonly level: number;
  readonly xpCurrent: number;
};

export type AppliedCharacterXpResult = CharacterLevelState & {
  readonly levelsGained: number;
  readonly xpGained: number;
};

/** XP para subir do nível atual ao próximo (personagem). */
export function getRequiredXpForNextLevel(level: number): number {
  return CharacterProgressionService.getRequiredXp(level);
}

/** Alias usado pelo PlayerDataStore e perfil do operativo. */
export function getCharacterXpForNextLevel(currentLevel: number): number {
  return getRequiredXpForNextLevel(currentLevel);
}

export type CharacterLevelXpBarView = {
  readonly level: number;
  readonly xpCurrent: number;
  readonly xpToNext: number;
  readonly percent: number;
  readonly remaining: number;
};

/** Barra de XP — usa `CharacterProgressionService.getRequiredXp` como teto. */
export function resolveCharacterLevelXpBar(
  level: number,
  xpCurrent: number,
): CharacterLevelXpBarView {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeXp = Math.max(0, Math.floor(xpCurrent));
  const xpToNext = getRequiredXpForNextLevel(safeLevel);
  const percent =
    xpToNext <= 0 ? 0 : Math.min(100, Math.max(0, (safeXp / xpToNext) * 100));

  return {
    level: safeLevel,
    xpCurrent: safeXp,
    xpToNext,
    percent,
    remaining: Math.max(0, xpToNext - safeXp),
  };
}

/** Aplica ganho de XP de personagem (PVE, quest, exploração). */
export function applyCharacterXpGain(
  state: CharacterLevelState,
  xpGain: number,
): AppliedCharacterXpResult {
  const gained = Math.floor(xpGain);
  if (gained <= 0) {
    return {
      level: Math.max(1, Math.floor(state.level)),
      xpCurrent: Math.max(0, Math.floor(state.xpCurrent)),
      levelsGained: 0,
      xpGained: 0,
    };
  }

  const startLevel = Math.max(1, Math.floor(state.level));
  let level = startLevel;
  let xpCurrent = Math.max(0, Math.floor(state.xpCurrent)) + gained;
  let xpToNext = getRequiredXpForNextLevel(level);

  while (xpCurrent >= xpToNext) {
    xpCurrent -= xpToNext;
    level += 1;
    xpToNext = getRequiredXpForNextLevel(level);
  }

  return {
    level,
    xpCurrent,
    levelsGained: level - startLevel,
    xpGained: gained,
  };
}
