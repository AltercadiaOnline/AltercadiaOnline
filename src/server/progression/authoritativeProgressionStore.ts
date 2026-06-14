import type { PlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import type { MarcosNodeProgressionData } from '../../shared/progression/marcoProgression.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import type {
  PersistedCharacterProfileSlice,
  PersistedMarcosSlice,
} from '../../shared/persistence/characterPersistenceRecord.js';
import { characterPersistenceKey } from '../../shared/persistence/characterPersistenceRecord.js';

type AuthoritativeProgressionEntry = {
  progression: PlayerProgressionData;
  marcos: PersistedMarcosSlice;
  characterProfile: PersistedCharacterProfileSlice;
};

const entries = new Map<string, AuthoritativeProgressionEntry>();

function defaultEntry(): AuthoritativeProgressionEntry {
  return {
    progression: createDefaultPlayerProgressionData(),
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      nodeProgression: emptyMarcosNodeProgression(),
    },
    characterProfile: {
      level: 1,
      xpCurrent: 0,
    },
  };
}

function key(playerId: string, characterId: number): string {
  return characterPersistenceKey(playerId, characterId);
}

export function getAuthoritativeProgression(
  playerId: string,
  characterId: number,
): AuthoritativeProgressionEntry {
  const existing = entries.get(key(playerId, characterId));
  if (!existing) return defaultEntry();
  return {
    progression: { ...existing.progression, movesetMastery: { ...existing.progression.movesetMastery } },
    marcos: {
      activeMarcos: [...existing.marcos.activeMarcos],
      flowSpeedBase: existing.marcos.flowSpeedBase,
      nodeProgression: {
        byNodeId: { ...existing.marcos.nodeProgression.byNodeId },
      },
    },
    characterProfile: { ...existing.characterProfile },
  };
}

export function loadAuthoritativeProgression(
  playerId: string,
  characterId: number,
  data: {
    readonly progression: PlayerProgressionData;
    readonly marcos: PersistedMarcosSlice;
    readonly characterProfile: PersistedCharacterProfileSlice;
  },
): void {
  entries.set(key(playerId, characterId), {
    progression: {
      ...data.progression,
      movesetMastery: { ...data.progression.movesetMastery },
    },
    marcos: {
      activeMarcos: [...data.marcos.activeMarcos],
      flowSpeedBase: data.marcos.flowSpeedBase,
      nodeProgression: {
        byNodeId: { ...data.marcos.nodeProgression.byNodeId },
      },
    },
    characterProfile: { ...data.characterProfile },
  });
}

export function patchAuthoritativeProgression(
  playerId: string,
  characterId: number,
  patch: Partial<{
    readonly progression: Partial<PlayerProgressionData>;
    readonly marcos: Partial<PersistedMarcosSlice> & {
      readonly nodeProgression?: MarcosNodeProgressionData;
    };
    readonly characterProfile: Partial<PersistedCharacterProfileSlice>;
  }>,
): void {
  const current = getAuthoritativeProgression(playerId, characterId);
  entries.set(key(playerId, characterId), {
    progression: {
      ...current.progression,
      ...(patch.progression ?? {}),
      movesetMastery: {
        ...current.progression.movesetMastery,
        ...(patch.progression?.movesetMastery ?? {}),
      },
    },
    marcos: {
      activeMarcos: patch.marcos?.activeMarcos ?? current.marcos.activeMarcos,
      flowSpeedBase: patch.marcos?.flowSpeedBase ?? current.marcos.flowSpeedBase,
      nodeProgression: patch.marcos?.nodeProgression ?? current.marcos.nodeProgression,
    },
    characterProfile: {
      ...current.characterProfile,
      ...(patch.characterProfile ?? {}),
    },
  });
}

export function resetAuthoritativeProgressionStore(): void {
  entries.clear();
}
