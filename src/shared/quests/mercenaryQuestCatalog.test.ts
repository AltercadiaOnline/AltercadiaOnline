import { describe, expect, it } from 'vitest';
import {
  buildMercenaryQuestBoard,
  getAllMercenaryQuests,
  getAvailableMercenaryQuests,
  getMercenaryQuestById,
  MERCENARY_QUEST_COUNT,
} from './mercenaryQuestCatalog.js';
import { acceptMercenaryQuest, abandonMercenaryQuest } from './mercenaryQuestProgress.js';
import { EMPTY_MERCENARY_QUEST_PROGRESS } from './mercenaryQuestTypes.js';

describe('mercenaryQuestCatalog', () => {
  it('expõe 19 contratos únicos com faixas de nível', () => {
    const quests = getAllMercenaryQuests();
    expect(quests).toHaveLength(19);
    expect(MERCENARY_QUEST_COUNT).toBe(19);
    const ids = new Set(quests.map((quest) => quest.id));
    expect(ids.size).toBe(19);
    expect(getMercenaryQuestById('quest_01')?.interaction).toMatch(/subornar/i);
    expect(getMercenaryQuestById('quest_19')?.npcGiver).toMatch(/eco narrativo/i);
    expect(getAllMercenaryQuests().every((quest) => quest.lore.length > 40 && quest.interaction.length > 20)).toBe(true);
  });

  it('filtra o quadro pela faixa do personagem', () => {
    expect(getAvailableMercenaryQuests(1).map((q) => q.id)).toEqual([
      'quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05',
    ]);
    expect(getAvailableMercenaryQuests(10).map((q) => q.id)).toEqual([
      'quest_01', 'quest_02', 'quest_03', 'quest_04', 'quest_05',
      'quest_06', 'quest_07', 'quest_08', 'quest_09', 'quest_10',
    ]);
    expect(getAvailableMercenaryQuests(35).every((q) => q.tier === 3)).toBe(true);
    expect(getAvailableMercenaryQuests(60).map((q) => q.id)).toEqual([
      'quest_14', 'quest_15', 'quest_16',
    ]);
    expect(getAvailableMercenaryQuests(90).map((q) => q.id)).toEqual([
      'quest_17', 'quest_18', 'quest_19',
    ]);
    expect(getAvailableMercenaryQuests(101)).toHaveLength(0);
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

    const band = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_19', 3);
    expect(band.ok).toBe(false);
    if (band.ok) return;
    expect(band.code).toBe('QUEST_LEVEL_BAND');
  });

  it('abandona o contrato ativo', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_04', 8);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const abandoned = abandonMercenaryQuest(accepted.progress, 'quest_04');
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    expect(abandoned.progress.activeQuestId).toBeNull();
  });
});
