import { describe, expect, it } from 'vitest';
import { DEATH_PENALTY_MIN_LEVEL } from './ProgressionPenaltyManager.js';
import { formatDeathPenaltySummaryLines } from './deathPenaltySummary.js';

describe('formatDeathPenaltySummaryLines', () => {
  it('proteção de tutorial', () => {
    const lines = formatDeathPenaltySummaryLines({
      applied: false,
      skippedReason: `Proteção de tutorial — nível 5 ≤ ${DEATH_PENALTY_MIN_LEVEL}.`,
      player: {
        level: 5,
        xpCurrent: 10,
        movesetMastery: {},
        milestoneTotalProgress: 0,
      },
      xpRemoved: 0,
      masteryRemoved: {},
      milestoneProgressRemoved: 0,
    });
    expect(lines.some((line) => line.includes('proteção'))).toBe(true);
    expect(lines.some((line) => line.includes('cidade'))).toBe(true);
  });

  it('lista perdas aplicadas', () => {
    const lines = formatDeathPenaltySummaryLines({
      applied: true,
      player: {
        level: 12,
        xpCurrent: 80,
        movesetMastery: { a: 10 },
        milestoneTotalProgress: 20,
      },
      xpRemoved: 20,
      masteryRemoved: { a: 0.5 },
      milestoneProgressRemoved: 1.2,
    });
    expect(lines).toContain('−20 XP de personagem');
    expect(lines.some((line) => line.includes('Marcos'))).toBe(true);
    expect(lines.some((line) => line.includes('domínio'))).toBe(true);
  });
});
