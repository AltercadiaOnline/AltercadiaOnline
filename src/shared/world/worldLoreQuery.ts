import { narrateWorldLoreEntry } from './worldLoreNarrator.js';
import {
  WORLD_LORE_ABSENCE_INTRO,
  WORLD_LORE_LONG_ABSENCE_MS,
  WORLD_LORE_MAX_LINES,
  type WorldChronicleLine,
  type WorldChroniclesSnapshot,
  type WorldLoreEntry,
  type WorldLoreImportance,
} from './worldLoreTypes.js';

const IMPORTANCE_RANK: Record<WorldLoreImportance, number> = {
  major: 0,
  notable: 1,
  minor: 2,
};

export type BuildChroniclesOptions = {
  readonly entries: readonly WorldLoreEntry[];
  readonly lastSeenAt: number | null;
  readonly prioritizeAbsence?: boolean;
  readonly now?: number;
  readonly maxLines?: number;
};

export function buildWorldChroniclesSnapshot(options: BuildChroniclesOptions): WorldChroniclesSnapshot {
  const now = options.now ?? Date.now();
  const maxLines = options.maxLines ?? WORLD_LORE_MAX_LINES;
  const lastSeenAt = options.lastSeenAt;
  const awayLongEnough =
    lastSeenAt !== null && now - lastSeenAt >= WORLD_LORE_LONG_ABSENCE_MS;
  const prioritizedAbsence = Boolean(options.prioritizeAbsence && awayLongEnough);

  let selected: WorldLoreEntry[];

  if (prioritizedAbsence && lastSeenAt !== null) {
    selected = options.entries
      .filter((entry) => entry.occurredAt > lastSeenAt)
      .sort(compareByImportanceThenRecency);
  } else {
    selected = [...options.entries].sort((a, b) => b.occurredAt - a.occurredAt);
  }

  const lines: WorldChronicleLine[] = selected.slice(0, maxLines).map((entry) => ({
    entryId: entry.id,
    narrative: narrateWorldLoreEntry(entry),
    occurredAt: entry.occurredAt,
    importance: entry.importance,
    ...(prioritizedAbsence ? { missedWhileAway: true } : {}),
  }));

  return {
    lines,
    prioritizedAbsence,
    absenceIntro: prioritizedAbsence ? WORLD_LORE_ABSENCE_INTRO : null,
    lastSeenAt,
    fetchedAt: now,
  };
}

function compareByImportanceThenRecency(a: WorldLoreEntry, b: WorldLoreEntry): number {
  const rank = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
  if (rank !== 0) return rank;
  return b.occurredAt - a.occurredAt;
}
