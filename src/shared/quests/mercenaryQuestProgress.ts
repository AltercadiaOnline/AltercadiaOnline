import {
  getMercenaryQuestById,
  isMercenaryQuestUnlocked,
} from './mercenaryQuestCatalog.js';
import {
  isMercenaryQuestReadyToComplete,
  resetMercenaryQuestStepFields,
} from './mercenaryQuestStepEngine.js';
import {
  EMPTY_MERCENARY_QUEST_PROGRESS,
  type MercenaryQuestProgress,
} from './mercenaryQuestTypes.js';

export type MercenaryQuestMutationResult =
  | { readonly ok: true; readonly progress: MercenaryQuestProgress }
  | { readonly ok: false; readonly code: string; readonly message: string };

function cloneProgress(progress: MercenaryQuestProgress): MercenaryQuestProgress {
  return {
    activeQuestId: progress.activeQuestId,
    completedQuestIds: [...progress.completedQuestIds],
    stepIndex: progress.stepIndex,
    completedStepTargets: [...progress.completedStepTargets],
    readyToTurnIn: progress.readyToTurnIn,
  };
}

export function createEmptyMercenaryQuestProgress(): MercenaryQuestProgress {
  return cloneProgress(EMPTY_MERCENARY_QUEST_PROGRESS);
}

export function sanitizeMercenaryQuestProgress(raw: unknown): MercenaryQuestProgress {
  if (!raw || typeof raw !== 'object') return createEmptyMercenaryQuestProgress();
  const record = raw as Partial<MercenaryQuestProgress>;
  const activeQuestId =
    typeof record.activeQuestId === 'string' && getMercenaryQuestById(record.activeQuestId)
      ? record.activeQuestId
      : null;
  const completedQuestIds = Array.isArray(record.completedQuestIds)
    ? record.completedQuestIds.filter(
      (id): id is string => typeof id === 'string' && Boolean(getMercenaryQuestById(id)),
    )
    : [];
  const stepIndex = activeQuestId && typeof record.stepIndex === 'number' && record.stepIndex >= 0
    ? Math.floor(record.stepIndex)
    : 0;
  const completedStepTargets = activeQuestId && Array.isArray(record.completedStepTargets)
    ? record.completedStepTargets.filter((id): id is string => typeof id === 'string')
    : [];
  const readyToTurnIn = activeQuestId ? record.readyToTurnIn === true : false;

  if (!activeQuestId) {
    return {
      activeQuestId: null,
      completedQuestIds: [...new Set(completedQuestIds)],
      ...resetMercenaryQuestStepFields(),
    };
  }

  return {
    activeQuestId,
    completedQuestIds: [...new Set(completedQuestIds)],
    stepIndex,
    completedStepTargets,
    readyToTurnIn,
  };
}

export function acceptMercenaryQuest(
  progress: MercenaryQuestProgress,
  questId: string,
  _playerLevel?: number,
): MercenaryQuestMutationResult {
  const quest = getMercenaryQuestById(questId);
  if (!quest) {
    return { ok: false, code: 'QUEST_NOT_FOUND', message: 'Contrato inexistente no quadro.' };
  }
  if (!isMercenaryQuestUnlocked(quest, progress)) {
    return {
      ok: false,
      code: 'QUEST_TIER_LOCKED',
      message: 'Complete as 5 missões do tier anterior para liberar este contrato.',
    };
  }
  if (progress.completedQuestIds.includes(quest.id)) {
    return { ok: false, code: 'QUEST_ALREADY_DONE', message: 'Este contrato já foi encerrado.' };
  }
  if (progress.activeQuestId === quest.id) {
    return { ok: false, code: 'QUEST_ALREADY_ACTIVE', message: 'Este contrato já está ativo.' };
  }
  if (progress.activeQuestId) {
    return {
      ok: false,
      code: 'QUEST_SLOT_BUSY',
      message: 'Abandone o contrato ativo antes de assinar outro.',
    };
  }
  return {
    ok: true,
    progress: {
      activeQuestId: quest.id,
      completedQuestIds: [...progress.completedQuestIds],
      ...resetMercenaryQuestStepFields(),
    },
  };
}

export function abandonMercenaryQuest(
  progress: MercenaryQuestProgress,
  questId?: string,
): MercenaryQuestMutationResult {
  if (!progress.activeQuestId) {
    return { ok: false, code: 'QUEST_NONE_ACTIVE', message: 'Nenhum contrato ativo para abandonar.' };
  }
  if (questId && questId !== progress.activeQuestId) {
    return { ok: false, code: 'QUEST_NOT_ACTIVE', message: 'Esse contrato não é o ativo.' };
  }
  return {
    ok: true,
    progress: {
      activeQuestId: null,
      completedQuestIds: [...progress.completedQuestIds],
      ...resetMercenaryQuestStepFields(),
    },
  };
}

/**
 * Entrega no NPC — marca concluído. Grant XP/VOLTS fica no handler (autoridade).
 * Exige readyToTurnIn (passos no mundo concluídos).
 */
export function completeMercenaryQuest(
  progress: MercenaryQuestProgress,
  questId?: string,
): MercenaryQuestMutationResult {
  if (!progress.activeQuestId) {
    return { ok: false, code: 'QUEST_NONE_ACTIVE', message: 'Nenhum contrato ativo para entregar.' };
  }
  if (questId && questId !== progress.activeQuestId) {
    return { ok: false, code: 'QUEST_NOT_ACTIVE', message: 'Esse contrato não é o ativo.' };
  }
  if (!isMercenaryQuestReadyToComplete(progress)) {
    return {
      ok: false,
      code: 'QUEST_NOT_READY',
      message: 'Conclua os objetivos no mundo antes de entregar no Quadro.',
    };
  }
  const doneId = progress.activeQuestId;
  if (!getMercenaryQuestById(doneId)) {
    return { ok: false, code: 'QUEST_NOT_FOUND', message: 'Contrato inexistente no quadro.' };
  }
  if (progress.completedQuestIds.includes(doneId)) {
    return { ok: false, code: 'QUEST_ALREADY_DONE', message: 'Este contrato já foi encerrado.' };
  }
  return {
    ok: true,
    progress: {
      activeQuestId: null,
      completedQuestIds: [...progress.completedQuestIds, doneId],
      ...resetMercenaryQuestStepFields(),
    },
  };
}
