export const WorldLoreEventKind = {
  FACTION_DOMINANCE: 'FACTION_DOMINANCE',
  PLAYER_ACHIEVEMENT: 'PLAYER_ACHIEVEMENT',
  ZONE_SHIFT: 'ZONE_SHIFT',
  MARKET_RUMOR: 'MARKET_RUMOR',
  ARENA_FEAT: 'ARENA_FEAT',
} as const;

export type WorldLoreEventKind = (typeof WorldLoreEventKind)[keyof typeof WorldLoreEventKind];

export type WorldLoreImportance = 'minor' | 'notable' | 'major';

export type WorldLoreEntryPayload =
  | {
      readonly kind: typeof WorldLoreEventKind.FACTION_DOMINANCE;
      readonly factionName: string;
      readonly zoneName: string;
    }
  | {
      readonly kind: typeof WorldLoreEventKind.PLAYER_ACHIEVEMENT;
      readonly playerName: string;
      readonly achievementLabel: string;
    }
  | {
      readonly kind: typeof WorldLoreEventKind.ZONE_SHIFT;
      readonly zoneName: string;
      readonly detail: string;
    }
  | {
      readonly kind: typeof WorldLoreEventKind.MARKET_RUMOR;
      readonly districtName: string;
      readonly rumor: string;
    }
  | {
      readonly kind: typeof WorldLoreEventKind.ARENA_FEAT;
      readonly playerName: string;
      readonly featLabel: string;
    };

export type WorldLoreEntry = {
  readonly id: string;
  readonly importance: WorldLoreImportance;
  readonly occurredAt: number;
  readonly payload: WorldLoreEntryPayload;
};

export type WorldChronicleLine = {
  readonly entryId: string;
  readonly narrative: string;
  readonly occurredAt: number;
  readonly importance: WorldLoreImportance;
  readonly missedWhileAway?: boolean;
};

export type WorldChroniclesSnapshot = {
  readonly lines: readonly WorldChronicleLine[];
  readonly prioritizedAbsence: boolean;
  readonly absenceIntro: string | null;
  readonly lastSeenAt: number | null;
  readonly fetchedAt: number;
};

export type WorldChroniclesRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly prioritizeAbsence?: boolean;
};

/** Ausência longa — prioriza crônicas na primeira abertura após retorno. */
export const WORLD_LORE_LONG_ABSENCE_MS = 60 * 60 * 1000;

export const WORLD_LORE_MAX_LINES = 4;

export const WORLD_LORE_ABSENCE_INTRO =
  'Ah, viajante… muita água passou por debaixo da ponte desde a tua última passagem. Deixa-me contar o que ouvi enquanto estiveste fora.';
