import type { PersistedMarcosSlice } from '../../shared/persistence/characterPersistenceRecord.js';
import type { MarcoDominanceInput } from '../../shared/progression/estiloPersonagem.js';
import {
  MARCO_NODE_MAX_LEVEL,
  type MarcoNodeProgressSnapshot,
  type MarcosNodeProgressionData,
} from '../../shared/progression/marcoProgression.js';
import { MARCO_TREE_NODES } from '../../shared/progression/milestoneTreeCatalog.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';

const VALID_MARCO_NODE_IDS = new Set(MARCO_TREE_NODES.map((node) => node.id));

/** Marcos validados para montagem de combatant — mesma forma usada em `buildCombatantFromLoadout`. */
export type AuthoritativeCombatMarcos = Pick<
  MarcoDominanceInput,
  'activeMarcos' | 'nodeProgression'
>;

export function sanitizeAuthoritativeCombatMarcos(
  marcos: PersistedMarcosSlice,
): AuthoritativeCombatMarcos {
  const activeMarcos = marcos.activeMarcos.filter((id) => VALID_MARCO_NODE_IDS.has(id));

  const byNodeId: Record<string, MarcoNodeProgressSnapshot> = {};
  for (const [nodeId, snap] of Object.entries(marcos.nodeProgression.byNodeId)) {
    if (!VALID_MARCO_NODE_IDS.has(nodeId)) continue;
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
  return sanitizeAuthoritativeCombatMarcos(progressionState.marcos);
}
