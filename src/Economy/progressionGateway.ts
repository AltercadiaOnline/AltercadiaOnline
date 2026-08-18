import { globalEventBus } from './EventBus.js';
import { EconomyEventType } from '../shared/economy/events.js';
import type { MarcosStateSnapshot } from '../shared/playerDataSnapshots.js';
import {
  canChooseMarco,
  canSelectBranchStarter,
  resolveMarcoChooseBlockedMessage,
  sanitizeActiveMarcosForTrail,
  type MarcoTreePlayerContext,
} from '../shared/progression/milestoneTreeState.js';
import {
  isNodeOnRamificacao,
  resolveRamificacaoFromStarter,
  type MarcoRamificacaoId,
} from '../shared/progression/milestoneTreeCatalog.js';
import { applyMarcoProgressEvents } from '../shared/progression/marcoProgressEngine.js';
import type { MarcoProgressEvent } from '../shared/progression/marcoProgressEngine.js';
import {
  emptyMarcosNodeProgression,
  ensureMarcoNodeProgressEntry,
  type MarcoNodeProgressSnapshot,
  type MarcosNodeProgressionData,
} from '../shared/progression/marcoProgression.js';
import { createDefaultPlayerProgressionData } from '../shared/progression/playerProgressionData.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../server/progression/authoritativeProgressionStore.js';

export type ProgressionMutationResult =
  | { readonly ok: true; readonly marcosState: Omit<MarcosStateSnapshot, 'revision'> }
  | { readonly ok: false; readonly message: string };

function filterNodeProgressionToTrail(
  nodeProgression: MarcosNodeProgressionData,
  ramificacao: MarcoRamificacaoId | null,
  trilhaTravada: boolean,
): MarcosNodeProgressionData {
  if (!trilhaTravada || !ramificacao) {
    return emptyMarcosNodeProgression();
  }
  const byNodeId: Record<string, MarcoNodeProgressSnapshot> = {};
  for (const [nodeId, snap] of Object.entries(nodeProgression.byNodeId)) {
    if (isNodeOnRamificacao(nodeId, ramificacao)) {
      byNodeId[nodeId] = snap;
    }
  }
  return { byNodeId };
}

function buildMarcoContext(playerId: string, characterId: number): MarcoTreePlayerContext {
  const auth = getAuthoritativeProgression(playerId, characterId);
  const ramificacao = auth.progression.ramificacaoSelecionada;
  const trilhaTravada = auth.progression.trilhaTravada;
  return {
    activeMarcos: sanitizeActiveMarcosForTrail(
      auth.marcos.activeMarcos,
      ramificacao,
      trilhaTravada,
    ),
    flowSpeedBase: auth.marcos.flowSpeedBase,
    milestoneTotalProgress: auth.progression.milestoneTotalProgress,
    playerLevel: auth.characterProfile.level ?? 1,
    ramificacaoSelecionada: ramificacao,
    trilhaTravada,
    nodeProgression: filterNodeProgressionToTrail(
      auth.marcos.nodeProgression,
      ramificacao,
      trilhaTravada,
    ),
  };
}

function readMarcosState(playerId: string, characterId: number): Omit<MarcosStateSnapshot, 'revision'> {
  const auth = getAuthoritativeProgression(playerId, characterId);
  const ramificacao = auth.progression.ramificacaoSelecionada;
  const trilhaTravada = auth.progression.trilhaTravada;
  return {
    activeMarcos: sanitizeActiveMarcosForTrail(
      auth.marcos.activeMarcos,
      ramificacao,
      trilhaTravada,
    ),
    flowSpeedBase: auth.marcos.flowSpeedBase,
    milestoneTotalProgress: auth.progression.milestoneTotalProgress,
    ramificacaoSelecionada: ramificacao,
    trilhaTravada,
    nodeProgression: filterNodeProgressionToTrail(
      auth.marcos.nodeProgression,
      ramificacao,
      trilhaTravada,
    ),
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
  // Confirmar 1 trilha + 1º nível (starter) na mesma ativação do botão de cima.
  const activeMarcos = [starterNodeId];
  const nodeProgression = ensureMarcoNodeProgressEntry(
    filterNodeProgressionToTrail(
      current.marcos.nodeProgression,
      ramificacao,
      true,
    ),
    starterNodeId,
  );

  patchAuthoritativeProgression(playerId, characterId, {
    progression: {
      ramificacaoSelecionada: ramificacao,
      trilhaTravada: true,
    },
    marcos: { activeMarcos, nodeProgression },
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
  // Repara trilha legada sem starter antes de validar o 2º nó.
  repairTrailStarterIfNeeded(playerId, characterId);
  const ctx = buildMarcoContext(playerId, characterId);
  if (!canChooseMarco(nodeId, ctx)) {
    return {
      ok: false,
      message:
        resolveMarcoChooseBlockedMessage(nodeId, ctx)
        ?? 'Marco indisponível ou requisitos pendentes.',
    };
  }

  const current = getAuthoritativeProgression(playerId, characterId);
  const ramificacao = current.progression.ramificacaoSelecionada;
  const trilhaTravada = current.progression.trilhaTravada;
  const sanitized = sanitizeActiveMarcosForTrail(
    current.marcos.activeMarcos,
    ramificacao,
    trilhaTravada,
  );
  const activeMarcos = sanitized.includes(nodeId) ? sanitized : [...sanitized, nodeId];
  const nodeProgression = ensureMarcoNodeProgressEntry(
    filterNodeProgressionToTrail(
      current.marcos.nodeProgression,
      ramificacao,
      trilhaTravada,
    ),
    nodeId,
  );

  patchAuthoritativeProgression(playerId, characterId, {
    marcos: {
      activeMarcos,
      nodeProgression,
    },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}

/** Garante starter na trilha travada (save antigo sem 1º nível). */
export function repairTrailStarterIfNeeded(playerId: string, characterId: number): boolean {
  const current = getAuthoritativeProgression(playerId, characterId);
  const ramificacao = current.progression.ramificacaoSelecionada;
  const trilhaTravada = current.progression.trilhaTravada;
  if (!trilhaTravada || !ramificacao) return false;

  const repaired = sanitizeActiveMarcosForTrail(
    current.marcos.activeMarcos,
    ramificacao,
    trilhaTravada,
  );
  const same =
    repaired.length === current.marcos.activeMarcos.length
    && repaired.every((id, i) => id === current.marcos.activeMarcos[i]);
  if (same) return false;

  patchAuthoritativeProgression(playerId, characterId, {
    marcos: { activeMarcos: repaired },
  });
  emitMarcosStateUpdated(playerId, characterId, readMarcosState(playerId, characterId));
  return true;
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
  const activeMarcos = sanitizeActiveMarcosForTrail(
    auth.marcos.activeMarcos,
    auth.progression.ramificacaoSelecionada,
    auth.progression.trilhaTravada,
  );
  const result = applyMarcoProgressEvents(
    auth.marcos.nodeProgression,
    activeMarcos,
    events,
  );

  if (Object.keys(result.xpGainedByNode).length === 0) {
    return { ok: false, message: 'Nenhum marco ativo recebeu progressão.' };
  }

  patchAuthoritativeProgression(playerId, characterId, {
    marcos: { nodeProgression: result.progression, activeMarcos },
  });

  const marcosState = readMarcosState(playerId, characterId);
  emitMarcosStateUpdated(playerId, characterId, marcosState, intentId);
  return { ok: true, marcosState };
}
