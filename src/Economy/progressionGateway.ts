import { globalEventBus } from './EventBus.js';
import { EconomyEventType } from '../shared/economy/events.js';
import type { MarcosStateSnapshot } from '../shared/playerDataSnapshots.js';
import {
  canChooseMarco,
  canSelectBranchStarter,
  type MarcoTreePlayerContext,
} from '../shared/progression/milestoneTreeState.js';
import { resolveRamificacaoFromStarter } from '../shared/progression/milestoneTreeCatalog.js';
import { applyMarcoProgressEvents } from '../shared/progression/marcoProgressEngine.js';
import type { MarcoProgressEvent } from '../shared/progression/marcoProgressEngine.js';
import { emptyMarcosNodeProgression } from '../shared/progression/marcoProgression.js';
import { createDefaultPlayerProgressionData } from '../shared/progression/playerProgressionData.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../server/progression/authoritativeProgressionStore.js';

export type ProgressionMutationResult =
  | { readonly ok: true; readonly marcosState: Omit<MarcosStateSnapshot, 'revision'> }
  | { readonly ok: false; readonly message: string };

function buildMarcoContext(playerId: string, characterId: number): MarcoTreePlayerContext {
  const auth = getAuthoritativeProgression(playerId, characterId);
  return {
    activeMarcos: auth.marcos.activeMarcos,
    flowSpeedBase: auth.marcos.flowSpeedBase,
    milestoneTotalProgress: auth.progression.milestoneTotalProgress,
    playerLevel: auth.characterProfile.level ?? 1,
    ramificacaoSelecionada: auth.progression.ramificacaoSelecionada,
    trilhaTravada: auth.progression.trilhaTravada,
    nodeProgression: auth.marcos.nodeProgression,
  };
}

function readMarcosState(playerId: string, characterId: number): Omit<MarcosStateSnapshot, 'revision'> {
  const auth = getAuthoritativeProgression(playerId, characterId);
  return {
    activeMarcos: [...auth.marcos.activeMarcos],
    flowSpeedBase: auth.marcos.flowSpeedBase,
    milestoneTotalProgress: auth.progression.milestoneTotalProgress,
    ramificacaoSelecionada: auth.progression.ramificacaoSelecionada,
    trilhaTravada: auth.progression.trilhaTravada,
    nodeProgression: {
      byNodeId: { ...auth.marcos.nodeProgression.byNodeId },
    },
  };
}

function emitMarcosStateUpdated(
  playerId: string,
  characterId: number,
  marcosState: Omit<MarcosStateSnapshot, 'revision'>,
  intentId?: string,
): void {
  const revision = Date.now();
  globalEventBus.emit({
    type: EconomyEventType.MarcosStateUpdated,
    payload: {
      playerId,
      characterId,
      ...marcosState,
      revision,
      ...(intentId ? { intentId } : {}),
    },
  });
}

export function selectMarcoBranchAuthoritative(
  playerId: string,
  characterId: number,
  starterNodeId: string,
  intentId?: string,
): ProgressionMutationResult {
  const ctx = buildMarcoContext(playerId, characterId);
  if (!canSelectBranchStarter(starterNodeId, ctx)) {
    return { ok: false, message: 'Não foi possível escolher esta trilha.' };
  }

  const ramificacao = resolveRamificacaoFromStarter(starterNodeId);
  if (!ramificacao) {
    return { ok: false, message: 'Trilha inválida.' };
  }

  const current = getAuthoritativeProgression(playerId, characterId);
  const activeMarcos = current.marcos.activeMarcos.includes(starterNodeId)
    ? current.marcos.activeMarcos
    : [...current.marcos.activeMarcos, starterNodeId];

  patchAuthoritativeProgression(playerId, characterId, {
    progression: {
      ramificacaoSelecionada: ramificacao,
      trilhaTravada: true,
    },
    marcos: { activeMarcos },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}

export function chooseMarcoAuthoritative(
  playerId: string,
  characterId: number,
  nodeId: string,
  intentId?: string,
): ProgressionMutationResult {
  if (!canChooseMarco(nodeId, buildMarcoContext(playerId, characterId))) {
    return { ok: false, message: 'Marco indisponível ou requisitos pendentes.' };
  }

  const current = getAuthoritativeProgression(playerId, characterId);
  const activeMarcos = current.marcos.activeMarcos.includes(nodeId)
    ? current.marcos.activeMarcos
    : [...current.marcos.activeMarcos, nodeId];

  patchAuthoritativeProgression(playerId, characterId, {
    marcos: { activeMarcos },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}

export function resetMarcoTrailAuthoritative(
  playerId: string,
  characterId: number,
  intentId?: string,
): ProgressionMutationResult {
  patchAuthoritativeProgression(playerId, characterId, {
    progression: createDefaultPlayerProgressionData(),
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      nodeProgression: emptyMarcosNodeProgression(),
    },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}

export function progressMarcoAuthoritative(
  playerId: string,
  characterId: number,
  events: readonly MarcoProgressEvent[],
  intentId?: string,
): ProgressionMutationResult {
  if (events.length === 0) {
    return { ok: false, message: 'Nenhum evento de progressão informado.' };
  }

  const auth = getAuthoritativeProgression(playerId, characterId);
  const result = applyMarcoProgressEvents(
    auth.marcos.nodeProgression,
    auth.marcos.activeMarcos,
    events,
  );

  if (Object.keys(result.xpGainedByNode).length === 0) {
    return { ok: false, message: 'Nenhum marco ativo recebeu progressão.' };
  }

  patchAuthoritativeProgression(playerId, characterId, {
    marcos: { nodeProgression: result.progression },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}
