import { describe, expect, it } from 'vitest';
import { acceptMercenaryQuest } from './mercenaryQuestProgress.js';
import {
  advanceMercenaryQuestStep,
  resolveMercenaryQuestNpcOffer,
  resolveMercenaryQuestTrackerObjective,
  resolveMercenaryQuestTurnInItemId,
} from './mercenaryQuestStepEngine.js';
import { EMPTY_MERCENARY_QUEST_PROGRESS } from './mercenaryQuestTypes.js';
import { CITY_01_ID } from '../world/maps/city01.js';

describe('mercenaryQuestStepEngine', () => {
  it('Q1 — operário da Linha 4 concede código e libera turn-in', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const offer = resolveMercenaryQuestNpcOffer(
      accepted.progress,
      'operario_linha4',
      CITY_01_ID,
    );
    expect(offer?.actionLabel).toBe('Extrair código');

    const step = advanceMercenaryQuestStep(accepted.progress, {
      targetKind: 'npc',
      targetId: 'operario_linha4',
      mapId: CITY_01_ID,
    });
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    expect(step.grantsItem).toBe('codigo_desbloqueio');
    expect(step.progress.readyToTurnIn).toBe(true);
  });

  it('Q2 — resgata contrabandista e libera turn-in', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_02');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const offer = resolveMercenaryQuestNpcOffer(
      accepted.progress,
      'contrabandista',
      CITY_01_ID,
    );
    expect(offer?.actionLabel).toBe('Resgatar contact');

    const step = advanceMercenaryQuestStep(accepted.progress, {
      targetKind: 'npc',
      targetId: 'contrabandista',
      mapId: CITY_01_ID,
    });
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    expect(step.grantsItem).toBe('chave_mestre');
    expect(step.progress.readyToTurnIn).toBe(true);
    expect(resolveMercenaryQuestTurnInItemId('quest_02')).toBe('chave_mestre');
    expect(resolveMercenaryQuestTrackerObjective(step.progress)).toContain('Mercenário');
  });

  it('Q4 — três totens antes do turn-in', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_04');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const totems = ['quest_poi_q4_totem_1', 'quest_poi_q4_totem_2', 'quest_poi_q4_totem_3'] as const;
    let progress = accepted.progress;
    for (const targetId of totems) {
      const hit = advanceMercenaryQuestStep(progress, {
        targetKind: 'poi',
        targetId,
        mapId: CITY_01_ID,
      });
      expect(hit.ok).toBe(true);
      if (!hit.ok) return;
      progress = hit.progress;
    }
    expect(progress.readyToTurnIn).toBe(true);
    expect(resolveMercenaryQuestTurnInItemId('quest_04')).toBeNull();
  });

  it('Q1 — instância da cidade (#0) casa; operário do beco não', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const cityOffer = resolveMercenaryQuestNpcOffer(
      accepted.progress,
      'operario_linha4#0',
      CITY_01_ID,
    );
    expect(cityOffer?.actionLabel).toBe('Extrair código');

    const alleyOffer = resolveMercenaryQuestNpcOffer(
      accepted.progress,
      'operario_linha4#1',
      'farm_zone_01',
    );
    expect(alleyOffer).toBeNull();

    const step = advanceMercenaryQuestStep(accepted.progress, {
      targetKind: 'npc',
      targetId: 'operario_linha4#0',
      mapId: CITY_01_ID,
    });
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    expect(step.grantsItem).toBe('codigo_desbloqueio');
  });

  it('rejeita alvo fora do contrato ativo', () => {
    const accepted = acceptMercenaryQuest(EMPTY_MERCENARY_QUEST_PROGRESS, 'quest_01');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const wrong = advanceMercenaryQuestStep(accepted.progress, {
      targetKind: 'npc',
      targetId: 'contrabandista',
      mapId: CITY_01_ID,
    });
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.code).toBe('QUEST_TARGET_MISMATCH');
  });
});
