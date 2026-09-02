import { resolveNpcArchetypeId } from '../npc/resolveNpcArchetypeId.js';
import { getMercenaryQuestById } from './mercenaryQuestCatalog.js';
import { getMercenaryQuestPoiById } from './mercenaryQuestPoiCatalog.js';
import type { MercenaryQuestProgress } from './mercenaryQuestTypes.js';
import {
  buildMercenaryQuestTargetKey,
  getMercenaryQuestWorldBinding,
  type MercenaryQuestStepDef,
  type MercenaryQuestStepTarget,
  type MercenaryQuestWorldBinding,
} from './mercenaryQuestWorldBindings.js';

export type MercenaryQuestInteractRequest = {
  readonly targetKind: MercenaryQuestStepTarget['targetKind'];
  readonly targetId: string;
  readonly mapId: MercenaryQuestStepTarget['mapId'];
};

export type MercenaryQuestStepAdvanceResult =
  | {
    readonly ok: true;
    readonly progress: MercenaryQuestProgress;
    readonly grantsItem?: string;
    readonly objectiveShort?: string;
  }
  | { readonly ok: false; readonly code: string; readonly message: string };

export function resetMercenaryQuestStepFields(): Pick<
  MercenaryQuestProgress,
  'stepIndex' | 'completedStepTargets' | 'readyToTurnIn'
> {
  return {
    stepIndex: 0,
    completedStepTargets: [],
    readyToTurnIn: false,
  };
}

export function getActiveMercenaryQuestStep(
  progress: MercenaryQuestProgress,
): MercenaryQuestStepDef | null {
  if (!progress.activeQuestId || progress.readyToTurnIn) return null;
  const binding = getMercenaryQuestWorldBinding(progress.activeQuestId);
  if (!binding) return null;
  return binding.steps[progress.stepIndex] ?? null;
}

export function resolveMercenaryQuestTurnInItemId(
  questId: string,
  binding?: MercenaryQuestWorldBinding | null,
): string | null {
  const resolvedBinding = binding ?? getMercenaryQuestWorldBinding(questId);
  const quest = getMercenaryQuestById(questId);
  if (!resolvedBinding) {
    return quest?.rewardBonds.item ?? null;
  }
  if (resolvedBinding.turnInItemId === null) return null;
  if (typeof resolvedBinding.turnInItemId === 'string') return resolvedBinding.turnInItemId;
  const lastStep = resolvedBinding.steps[resolvedBinding.steps.length - 1];
  if (lastStep?.grantsItem) return lastStep.grantsItem;
  return quest?.rewardBonds.item ?? null;
}

export function resolveMercenaryQuestTrackerObjective(
  progress: MercenaryQuestProgress,
): string | null {
  if (!progress.activeQuestId) return null;
  if (progress.readyToTurnIn) {
    return 'Volte ao Mercenário para entregar o contrato.';
  }
  const step = getActiveMercenaryQuestStep(progress);
  if (step) return step.objectiveShort;
  const quest = getMercenaryQuestById(progress.activeQuestId);
  return quest?.interaction ?? null;
}

function targetMatchesStepTarget(
  interact: MercenaryQuestInteractRequest,
  target: MercenaryQuestStepTarget,
): boolean {
  if (interact.mapId !== target.mapId || interact.targetKind !== target.targetKind) {
    return false;
  }
  if (target.targetKind === 'npc') {
    return resolveNpcArchetypeId(interact.targetId) === resolveNpcArchetypeId(target.targetId);
  }
  return interact.targetId === target.targetId;
}

function findMatchingTarget(
  step: MercenaryQuestStepDef,
  interact: MercenaryQuestInteractRequest,
): MercenaryQuestStepTarget | null {
  return step.targets.find((target) => targetMatchesStepTarget(interact, target)) ?? null;
}

export function resolveMercenaryQuestNpcOffer(
  progress: MercenaryQuestProgress,
  npcId: string,
  mapId: MercenaryQuestStepTarget['mapId'],
): { readonly actionLabel: string; readonly objectiveShort: string } | null {
  const step = getActiveMercenaryQuestStep(progress);
  if (!step) return null;
  const match = step.targets.find(
    (target) => target.targetKind === 'npc'
      && resolveNpcArchetypeId(target.targetId) === resolveNpcArchetypeId(npcId)
      && target.mapId === mapId,
  );
  if (!match) return null;
  const targetKey = buildMercenaryQuestTargetKey(match.targetKind, match.targetId, match.mapId);
  if (progress.completedStepTargets.includes(targetKey)) return null;
  const quest = progress.activeQuestId ? getMercenaryQuestById(progress.activeQuestId) : null;
  const verb = quest?.interactionType === 'RESCUE_CONTACT'
    ? 'Resgatar contact'
    : quest?.interactionType === 'FETCH_WATCH'
      ? 'Buscar relógio'
      : quest?.interactionType === 'SCAN_TERMINAL'
        ? 'Extrair código'
        : 'Avançar contrato';
  return { actionLabel: verb, objectiveShort: step.objectiveShort };
}

export function resolveMercenaryQuestPoiOffer(
  progress: MercenaryQuestProgress,
  poiId: string,
  mapId: MercenaryQuestStepTarget['mapId'],
): { readonly actionLabel: string; readonly objectiveShort: string } | null {
  const step = getActiveMercenaryQuestStep(progress);
  if (!step) return null;
  const match = step.targets.find(
    (target) => target.targetKind === 'poi'
      && target.targetId === poiId
      && target.mapId === mapId,
  );
  if (!match) return null;
  const targetKey = buildMercenaryQuestTargetKey(match.targetKind, match.targetId, match.mapId);
  if (progress.completedStepTargets.includes(targetKey)) return null;
  const poi = getMercenaryQuestPoiById(poiId);
  return {
    actionLabel: poi?.actionLabel ?? 'Interagir',
    objectiveShort: step.objectiveShort,
  };
}

export function advanceMercenaryQuestStep(
  progress: MercenaryQuestProgress,
  interact: MercenaryQuestInteractRequest,
): MercenaryQuestStepAdvanceResult {
  if (!progress.activeQuestId) {
    return { ok: false, code: 'QUEST_NONE_ACTIVE', message: 'Nenhum contrato ativo.' };
  }
  if (progress.readyToTurnIn) {
    return { ok: false, code: 'QUEST_ALREADY_READY', message: 'Contrato pronto — entregue no Mercenário.' };
  }

  const binding = getMercenaryQuestWorldBinding(progress.activeQuestId);
  if (!binding || binding.steps.length === 0) {
    return { ok: false, code: 'QUEST_BINDING_MISSING', message: 'Contrato sem passos no mundo.' };
  }

  const step = binding.steps[progress.stepIndex];
  if (!step) {
    return { ok: false, code: 'QUEST_STEP_INVALID', message: 'Passo do contrato inválido.' };
  }

  const matchedTarget = findMatchingTarget(step, interact);
  if (!matchedTarget) {
    return { ok: false, code: 'QUEST_TARGET_MISMATCH', message: 'Este alvo não faz parte do contrato ativo.' };
  }

  const targetKey = buildMercenaryQuestTargetKey(
    matchedTarget.targetKind,
    matchedTarget.targetId,
    matchedTarget.mapId,
  );
  if (progress.completedStepTargets.includes(targetKey)) {
    return { ok: false, code: 'QUEST_TARGET_DONE', message: 'Este alvo já foi concluído.' };
  }

  const required = step.requiredCompletions ?? step.targets.length;
  const nextCompletedTargets = [...progress.completedStepTargets, targetKey];

  if (nextCompletedTargets.length < required) {
    return {
      ok: true,
      progress: {
        ...progress,
        completedStepTargets: nextCompletedTargets,
      },
      objectiveShort: step.objectiveShort,
    };
  }

  const grantsItem = step.grantsItem;
  const nextStepIndex = progress.stepIndex + 1;
  if (nextStepIndex < binding.steps.length) {
    const upcoming = binding.steps[nextStepIndex];
    const nextProgress: MercenaryQuestProgress = {
      ...progress,
      stepIndex: nextStepIndex,
      completedStepTargets: [],
    };
    if (grantsItem) {
      return {
        ok: true,
        progress: nextProgress,
        grantsItem,
        ...(upcoming?.objectiveShort ? { objectiveShort: upcoming.objectiveShort } : {}),
      };
    }
    return {
      ok: true,
      progress: nextProgress,
      ...(upcoming?.objectiveShort ? { objectiveShort: upcoming.objectiveShort } : {}),
    };
  }

  const finalProgress: MercenaryQuestProgress = {
    ...progress,
    readyToTurnIn: true,
    completedStepTargets: [],
  };
  if (grantsItem) {
    return {
      ok: true,
      progress: finalProgress,
      grantsItem,
      objectiveShort: 'Volte ao Mercenário para entregar o contrato.',
    };
  }
  return {
    ok: true,
    progress: finalProgress,
    objectiveShort: 'Volte ao Mercenário para entregar o contrato.',
  };
}

export function isMercenaryQuestReadyToComplete(progress: MercenaryQuestProgress): boolean {
  return Boolean(progress.activeQuestId && progress.readyToTurnIn);
}
