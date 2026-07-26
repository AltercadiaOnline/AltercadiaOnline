import type { PlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import type { MarcosNodeProgressionData, MarcoNodeProgressSnapshot } from '../../shared/progression/marcoProgression.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import type {
  PersistedCharacterProfileSlice,
  PersistedMarcosSlice,
} from '../../shared/persistence/characterPersistenceRecord.js';
import { characterPersistenceKey } from '../../shared/persistence/characterPersistenceRecord.js';
import { sanitizeActiveMarcosForTrail } from '../../shared/progression/milestoneTreeState.js';
import { isNodeOnRamificacao } from '../../shared/progression/milestoneTreeCatalog.js';
import { markCharacterPersistenceDirty } from '../persistence/characterPersistenceDirty.js';

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

function sanitizeProgressionEntry(data: AuthoritativeProgressionEntry): AuthoritativeProgressionEntry {
  const ramificacao = data.progression.ramificacaoSelecionada;
  const trilhaTravada = data.progression.trilhaTravada;
  const activeMarcos = sanitizeActiveMarcosForTrail(
    data.marcos.activeMarcos,
    ramificacao,
    trilhaTravada,
  );

  let nodeProgression = data.marcos.nodeProgression;
  if (!trilhaTravada || !ramificacao) {
    nodeProgression = emptyMarcosNodeProgression();
  } else {
    const byNodeId: Record<string, MarcoNodeProgressSnapshot> = {};
    for (const [nodeId, snap] of Object.entries(data.marcos.nodeProgression.byNodeId)) {
      if (isNodeOnRamificacao(nodeId, ramificacao)) {
        byNodeId[nodeId] = snap;
      }
    }
    nodeProgression = { byNodeId };
  }

  return {
    progression: {
      ...data.progression,
      movesetMastery: { ...data.progression.movesetMastery },
      // Trilha inconsistente (travada sem ramificação) → força reset de escolha.
      ramificacaoSelecionada: trilhaTravada ? ramificacao : null,
      trilhaTravada: Boolean(trilhaTravada && ramificacao),
    },
    marcos: {
      activeMarcos,
      flowSpeedBase: data.marcos.flowSpeedBase,
      nodeProgression,
    },
    characterProfile: { ...data.characterProfile },
  };
}

export function getAuthoritativeProgression(
  playerId: string,
  characterId: number,
): AuthoritativeProgressionEntry {
  const existing = entries.get(key(playerId, characterId));
  if (!existing) return defaultEntry();
  return sanitizeProgressionEntry(existing);
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
  entries.set(
    key(playerId, characterId),
    sanitizeProgressionEntry({
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
    }),
  );
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
  entries.set(
    key(playerId, characterId),
    sanitizeProgressionEntry({
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
    }),
  );
  markCharacterPersistenceDirty(playerId, characterId, 'progression');
}

export function resetAuthoritativeProgressionStore(): void {
  entries.clear();
}

/** Remove entrada em memória ao excluir personagem. */
export function clearAuthoritativeProgression(
  playerId: string,
  characterId: number,
): void {
  entries.delete(key(playerId, characterId));
}
