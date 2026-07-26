import type { PersistedMarcosSlice } from '../../shared/persistence/characterPersistenceRecord.js';
import type { MarcoDominanceInput } from '../../shared/progression/estiloPersonagem.js';
import {
  MARCO_NODE_MAX_LEVEL,
  type MarcoNodeProgressSnapshot,
} from '../../shared/progression/marcoProgression.js';
import {
  MARCO_TREE_NODES,
  type MarcoRamificacaoId,
} from '../../shared/progression/milestoneTreeCatalog.js';
import { sanitizeActiveMarcosForTrail } from '../../shared/progression/milestoneTreeState.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';

const VALID_MARCO_NODE_IDS = new Set(MARCO_TREE_NODES.map((node) => node.id));

/** Marcos validados para montagem de combatant — mesma forma usada em `buildCombatantFromLoadout`. */
export type AuthoritativeCombatMarcos = Pick<
  MarcoDominanceInput,
  'activeMarcos' | 'nodeProgression'
>;

export function sanitizeAuthoritativeCombatMarcos(
  marcos: PersistedMarcosSlice,
  ramificacaoSelecionada: MarcoRamificacaoId | null = null,
  trilhaTravada = false,
): AuthoritativeCombatMarcos {
  const validIds = marcos.activeMarcos.filter((id) => VALID_MARCO_NODE_IDS.has(id));
  const activeMarcos = sanitizeActiveMarcosForTrail(
    validIds,
    ramificacaoSelecionada,
    trilhaTravada,
  );

  const byNodeId: Record<string, MarcoNodeProgressSnapshot> = {};
  for (const [nodeId, snap] of Object.entries(marcos.nodeProgression.byNodeId)) {
    if (!VALID_MARCO_NODE_IDS.has(nodeId)) continue;
    if (!activeMarcos.includes(nodeId) && !ramificacaoSelecionada) continue;
    if (ramificacaoSelecionada) {
      const node = MARCO_TREE_NODES.find((entry) => entry.id === nodeId);
      if (!node || node.branch !== ramificacaoSelecionada) continue;
    }
    if (!snap || typeof snap.level !== 'number') continue;
    byNodeId[nodeId] = {
      nodeId,
      level: Math.min(MARCO_NODE_MAX_LEVEL, Math.max(1, Math.floor(snap.level))),
      xp: typeof snap.xp === 'number' ? Math.max(0, Math.floor(snap.xp)) : 0,
      nextLevelThreshold:
        typeof snap.nextLevelThreshold === 'number'
          ? Math.max(0, Math.floor(snap.nextLevelThreshold))
          : 0,
    };
  }

  return {
    activeMarcos,
    nodeProgression: { byNodeId },
  };
}

/** Fonte única de marcos no combat-join — ignora snapshot enviado pelo cliente. */
export function getAuthoritativeCombatMarcos(
  playerId: string,
  characterId: number,
): AuthoritativeCombatMarcos {
  const progressionState = getAuthoritativeProgression(playerId, characterId);
  return sanitizeAuthoritativeCombatMarcos(
    progressionState.marcos,
    progressionState.progression.ramificacaoSelecionada,
    progressionState.progression.trilhaTravada,
  );
}
