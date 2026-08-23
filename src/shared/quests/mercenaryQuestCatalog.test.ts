import { describe, expect, it } from 'vitest';
import {
  buildMercenaryQuestBoard,
  getAllMercenaryQuests,
  getAvailableMercenaryQuests,
  getMercenaryQuestById,
  MERCENARY_QUEST_BANDS,
  MERCENARY_QUEST_COUNT,
} from './mercenaryQuestCatalog.js';
import {
  acceptMercenaryQuest,
  abandonMercenaryQuest,
  completeMercenaryQuest,
} from './mercenaryQuestProgress.js';
import { EMPTY_MERCENARY_QUEST_PROGRESS } from './mercenaryQuestTypes.js';

describe('mercenaryQuestCatalog', () => {
  it('piloto: 15 contratos em 3 faixas exclusivas × 5', () => {
    const quests = getAllMercenaryQuests();
    expect(quests).toHaveLength(15);
    expect(MERCENARY_QUEST_COUNT).toBe(15);
    expect(MERCENARY_QUEST_BANDS).toHaveLength(3);
    const ids = new Set(quests.map((quest) => quest.id));
    expect(ids.size).toBe(15);
    expect(quests.every((q) => q.rewardVolts > 0 && q.rewardExp > 0)).toBe(true);
    expect(getMercenaryQuestById('quest_01')?.maxLevel).toBe(10);
    expect(getMercenaryQuestById('quest_06')?.minLevel).toBe(11);
    expect(getMercenaryQuestById('quest_11')?.minLevel).toBe(31);
  });

  it('filtra o quadro por faixas exclusivas (sem overlap no Nv. 10/30)', () => {
    expect(getAvailableMercenaryQuests(1).map((q) => q.id)).toEqual([
      'quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05',
    ]);
    expect(getAvailableMercenaryQuests(10).map((q) => q.id)).toEqual([
      'quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05',
    ]);
    expect(getAvailableMercenaryQuests(11).map((q) => q.id)).toEqual([
      'quest_06', 'quest_07', 'quest_08', 'quest_09', 'quest_10',
    ]);
    expect(getAvailableMercenaryQuests(30).every((q) => q.tier === 2)).toBe(true);
    expect(getAvailableMercenaryQuests(31).map((q) => q.id)).toEqual([
      'quest_11', 'quest_12', 'quest_13', 'quest_14', 'quest_15',
    ]);
    expect(getAvailableMercenaryQuests(50).every((q) => q.tier === 3)).toBe(true);
    expect(getAvailableMercenaryQuests(51)).toHaveLength(0);
  });

  it('marca ativo e concluído no board sem vazar contratos fora da faixa', () => {
    const board = buildMercenaryQuestBoard(5, {
      activeQuestId: 'quest_02',
      completedQuestIds: ['quest_01'],
    });
    expect(board).toHaveLength(5);
    expect(board.find((row) => row.id === 'quest_01')?.status).toBe('completed');
    expect(board.find((row) => row.id === 'quest_02')?.status).toBe('active');
    expect(board.find((row) => row.id === 'quest_03')?.status).toBe('available');
    expect(board.some((row) => row.id === 'quest_11')).toBe(false);
  });
});

describe('mercenaryQuestProgress', () => {
  it('aceita só na faixa e com slot livre', () => {
    const ok = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01', 3);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.progress.activeQuestId).toBe('quest_01');

    const busy = acceptMercenaryQuest(ok.progress, 'quest_02', 3);
    expect(busy.ok).toBe(false);
    if (busy.ok) return;
    expect(busy.code).toBe('QUEST_SLOT_BUSY');

    const band = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_15', 3);
    expect(band.ok).toBe(false);
    if (band.ok) return;
    expect(band.code).toBe('QUEST_LEVEL_BAND');
  });

  it('abandona o contrato ativo (livre — pode reassinar)', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_04', 8);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const abandoned = abandonMercenaryQuest(accepted.progress, 'quest_04');
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    expect(abandoned.progress.activeQuestId).toBeNull();
    const again = acceptMercenaryQuest(abandoned.progress, 'quest_04', 8);
    expect(again.ok).toBe(true);
  });

  it('completa o ativo e marca concluído', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01', 2);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const done = completeMercenaryQuest(accepted.progress, 'quest_01');
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.progress.activeQuestId).toBeNull();
    expect(done.progress.completedQuestIds).toEqual(['quest_01']);
    const again = acceptMercenaryQuest(done.progress, 'quest_01', 2);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe('QUEST_ALREADY_DONE');
  });
});
