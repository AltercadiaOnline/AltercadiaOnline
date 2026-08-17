import { getMercenaryQuestById, isMercenaryQuestInLevelBand } from './mercenaryQuestCatalog.js';
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
  return {
    activeQuestId,
    completedQuestIds: [...new Set(completedQuestIds)],
  };
}

export function acceptMercenaryQuest(
  progress: MercenaryQuestProgress,
  questId: string,
  playerLevel: number,
): MercenaryQuestMutationResult {
  const quest = getMercenaryQuestById(questId);
  if (!quest) {
    return { ok: false, code: 'QUEST_NOT_FOUND', message: 'Contrato inexistente no quadro.' };
  }
  if (!isMercenaryQuestInLevelBand(quest, playerLevel)) {
    return {
      ok: false,
      code: 'QUEST_LEVEL_BAND',
      message: `Este contrato exige nível ${quest.minLevel}–${quest.maxLevel}.`,
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
    },
  };
}
