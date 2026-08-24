import { describe, expect, it } from 'vitest';
import {
  CAEL_CHRONICLE_CHAPTERS,
  createEmptyCaelChronicleProgress,
  hearNextCaelChronicle,
  sanitizeCaelChronicleProgress,
} from './caelChronicleBook.js';

describe('caelChronicleBook', () => {
  it('desbloqueia o prólogo a partir do progresso vazio', () => {
    const result = hearNextCaelChronicle(createEmptyCaelChronicleProgress());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chapter.id).toBe('livro1_prologo');
    expect(result.progress.unlockedChapterIds).toEqual(['livro1_prologo']);
  });

  it('recusa ouvir além do último capítulo', () => {
    const all = CAEL_CHRONICLE_CHAPTERS.map((chapter) => chapter.id);
    const result = hearNextCaelChronicle({
      unlockedChapterIds: all,
      unlockedQuestHookIds: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('TOME_COMPLETE');
  });

  it('corta buracos na sequência e só então libera o gancho do capítulo', () => {
    const sanitized = sanitizeCaelChronicleProgress({
      unlockedChapterIds: ['livro1_prologo', 'livro1_vortex', 'livro1_arquiteto'],
      unlockedQuestHookIds: ['tese_arquiteto', 'gancho_inventado'],
    });
    expect(sanitized.unlockedChapterIds).toEqual(['livro1_prologo', 'livro1_vortex']);
    expect(sanitized.unlockedQuestHookIds).toEqual(['tese_vortex_nexgrid']);
  });
});
