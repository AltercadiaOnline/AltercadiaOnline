import { describe, expect, it } from 'vitest';
import {
  buildMercenaryQuestBoard,
  getAllMercenaryQuests,
  getAvailableMercenaryQuests,
  getMercenaryQuestById,
  isMercenaryTierComplete,
  MERCENARY_QUEST_BANDS,
  MERCENARY_QUEST_COUNT,
  resolveHighestUnlockedMercenaryTier,
} from './mercenaryQuestCatalog.js';
import {
  acceptMercenaryQuest,
  abandonMercenaryQuest,
  completeMercenaryQuest,
  createEmptyMercenaryQuestProgress,
} from './mercenaryQuestProgress.js';
import { EMPTY_MERCENARY_QUEST_PROGRESS } from './mercenaryQuestTypes.js';

const TIER1_IDS = ['quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05'] as const;
const TIER2_IDS = ['quest_06', 'quest_07', 'quest_08', 'quest_09', 'quest_10'] as const;

describe('mercenaryQuestCatalog', () => {
  it('15 contratos em 3 faixas × 5 (cronograma)', () => {
    const quests = getAllMercenaryQuests();
    expect(quests).toHaveLength(15);
    expect(MERCENARY_QUEST_COUNT).toBe(15);
    expect(MERCENARY_QUEST_BANDS).toHaveLength(3);
    const ids = new Set(quests.map((quest) => quest.id));
    expect(ids.size).toBe(15);
    expect(quests.every((q) => q.rewardVolts > 0 && q.rewardExp > 0)).toBe(true);
    expect(getMercenaryQuestById('quest_01')?.title).toBe('Sinal Fantasma na Linha 4');
    expect(getMercenaryQuestById('quest_01')?.interaction).toContain('operário da Linha 4');
    expect(getMercenaryQuestById('quest_01')?.loreSummary).toContain('estação');
    expect(getMercenaryQuestById('quest_01')?.maxLevel).toBe(10);
    expect(getMercenaryQuestById('quest_06')?.minLevel).toBe(11);
    expect(getMercenaryQuestById('quest_06')?.maxLevel).toBe(20);
    expect(getMercenaryQuestById('quest_11')?.minLevel).toBe(21);
    expect(MERCENARY_QUEST_BANDS[2]?.maxLevel).toBe(30);
  });

  it('libera só tier 1 até completar as 5; depois abre tier 2', () => {
    expect(resolveHighestUnlockedMercenaryTier(EMPTY_MERCENARY_QUEST_PROGRESS)).toBe(1);
    expect(getAvailableMercenaryQuests(EMPTY_MERCENARY_QUEST_PROGRESS).map((q) => q.id)).toEqual([
      ...TIER1_IDS,
    ]);

    const halfDone = {
      ...createEmptyMercenaryQuestProgress(),
      completedQuestIds: ['quest_01', 'quest_02'],
    };
    expect(resolveHighestUnlockedMercenaryTier(halfDone)).toBe(1);
    expect(isMercenaryTierComplete(1, halfDone)).toBe(false);

    const tier1Done = {
      ...createEmptyMercenaryQuestProgress(),
      completedQuestIds: [...TIER1_IDS],
    };
    expect(isMercenaryTierComplete(1, tier1Done)).toBe(true);
    expect(resolveHighestUnlockedMercenaryTier(tier1Done)).toBe(2);
    expect(getAvailableMercenaryQuests(tier1Done).map((q) => q.id)).toEqual([
      ...TIER1_IDS,
      ...TIER2_IDS,
    ]);

    const tier2Done = {
      ...createEmptyMercenaryQuestProgress(),
      completedQuestIds: [...TIER1_IDS, ...TIER2_IDS],
    };
    expect(resolveHighestUnlockedMercenaryTier(tier2Done)).toBe(3);
  });

  it('monta board do tier pedido com status', () => {
    const board = buildMercenaryQuestBoard(
      {
        ...createEmptyMercenaryQuestProgress(),
        activeQuestId: 'quest_02',
        completedQuestIds: ['quest_01'],
      },
      { tier: 1 },
    );
    expect(board).toHaveLength(5);
    expect(board.find((row) => row.id === 'quest_01')?.status).toBe('completed');
    expect(board.find((row) => row.id === 'quest_02')?.status).toBe('active');
    expect(board.find((row) => row.id === 'quest_03')?.status).toBe('available');
    expect(board.some((row) => row.id === 'quest_11')).toBe(false);
  });
});

describe('mercenaryQuestProgress', () => {
  it('aceita só com tier liberado e slot livre', () => {
    const ok = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01');
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.progress.activeQuestId).toBe('quest_01');

    const busy = acceptMercenaryQuest(ok.progress, 'quest_02');
    expect(busy.ok).toBe(false);
    if (busy.ok) return;
    expect(busy.code).toBe('QUEST_SLOT_BUSY');

    const locked = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_06');
    expect(locked.ok).toBe(false);
    if (locked.ok) return;
    expect(locked.code).toBe('QUEST_TIER_LOCKED');
  });

  it('libera accept do tier 2 após as 5 do tier 1', () => {
    const unlocked = {
      ...createEmptyMercenaryQuestProgress(),
      completedQuestIds: [...TIER1_IDS],
    };
    const ok = acceptMercenaryQuest(unlocked, 'quest_06');
    expect(ok.ok).toBe(true);
  });

  it('abandona o contrato ativo (livre — pode reassinar)', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_04');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const abandoned = abandonMercenaryQuest(accepted.progress, 'quest_04');
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    expect(abandoned.progress.activeQuestId).toBeNull();
    const again = acceptMercenaryQuest(abandoned.progress, 'quest_04');
    expect(again.ok).toBe(true);
  });

  it('completa o ativo só após readyToTurnIn', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const premature = completeMercenaryQuest(accepted.progress, 'quest_01');
    expect(premature.ok).toBe(false);
    if (premature.ok) return;
    expect(premature.code).toBe('QUEST_NOT_READY');

    const ready = { ...accepted.progress, readyToTurnIn: true };
    const done = completeMercenaryQuest(ready, 'quest_01');
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.progress.activeQuestId).toBeNull();
    expect(done.progress.completedQuestIds).toEqual(['quest_01']);
    const again = acceptMercenaryQuest(done.progress, 'quest_01');
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe('QUEST_ALREADY_DONE');
  });
});
