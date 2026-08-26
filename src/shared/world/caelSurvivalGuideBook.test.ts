import { describe, expect, it } from 'vitest';
import {
  CAEL_SURVIVAL_LESSONS,
  resolveCaelDailySurvivalLesson,
} from './caelSurvivalGuideBook.js';

describe('caelSurvivalGuideBook', () => {
  it('resolve a lição diária do shard e faz loop no fim do guia', () => {
    expect(resolveCaelDailySurvivalLesson(0).id).toBe('guide_movimento');
    expect(resolveCaelDailySurvivalLesson(1).id).toBe('guide_interacao');
    const lastIndex = CAEL_SURVIVAL_LESSONS.length - 1;
    expect(resolveCaelDailySurvivalLesson(lastIndex).id).toBe('guide_hub_social');
    expect(resolveCaelDailySurvivalLesson(lastIndex + 1).id).toBe('guide_movimento');
  });
});
