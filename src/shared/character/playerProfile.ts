import { getCharacterXpForNextLevel } from './characterLevelProgression.js';

/** Progressão e metadados exibidos na ficha do operativo. */
export type PlayerPvpRecord = {
  readonly battles: number;
  readonly wins: number;
  readonly losses: number;
};

export type PlayerProfileSnapshot = {
  readonly displayName: string;
  readonly level: number;
  readonly xpCurrent: number;
  readonly xpToNext: number;
  readonly pvp: PlayerPvpRecord;
};

/** @deprecated Prefer `getCharacterXpForNextLevel` — alias de compatibilidade. */
export function resolveXpToNextLevel(level: number): number {
  return getCharacterXpForNextLevel(level);
}

export {
  getCharacterXpForNextLevel,
  getRequiredXpForNextLevel,
} from './characterLevelProgression.js';
export function createDemoProfile(level: number, displayName = 'Operative'): PlayerProfileSnapshot {
  const xpToNext = resolveXpToNextLevel(level);
  return {
    displayName,
    level,
    xpCurrent: Math.floor(xpToNext * 0.42),
    xpToNext,
    pvp: { battles: 12, wins: 7, losses: 5 },
  };
}
