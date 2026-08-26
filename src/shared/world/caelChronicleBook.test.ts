import { describe, expect, it } from 'vitest';
import {
  CAEL_CHRONICLE_CHAPTERS,
  resolveCaelDailyChapter,
} from './caelChronicleBook.js';

describe('caelChronicleBook', () => {
  it('resolve a crônica diária do shard e faz loop no fim do tomo', () => {
    expect(resolveCaelDailyChapter(0).id).toBe('livro1_prologo');
    expect(resolveCaelDailyChapter(1).id).toBe('livro1_vortex');
    const lastIndex = CAEL_CHRONICLE_CHAPTERS.length - 1;
    expect(resolveCaelDailyChapter(lastIndex).id).toBe('livro1_arquiteto');
    expect(resolveCaelDailyChapter(lastIndex + 1).id).toBe('livro1_prologo');
    expect(resolveCaelDailyChapter(lastIndex + 2).id).toBe('livro1_vortex');
  });
});
