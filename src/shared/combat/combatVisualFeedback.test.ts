import { describe, expect, it } from 'vitest';
import { CombatEventType } from '../events.js';
import { buildCombatVisualFeedback } from './combatVisualFeedback.js';

function damageEvent(hpAfter: number) {
  return {
    type: CombatEventType.DAMAGE_DEALT,
    payload: {
      battleId: 'b1',
      sourceId: 'player_1',
      targetId: 'enemy_1',
      amount: 12,
      hpAfter,
    },
  } as const;
}

describe('buildCombatVisualFeedback killing blow', () => {
  it('não recua o atacante no golpe que zera o alvo', () => {
    const ko = buildCombatVisualFeedback([damageEvent(0)]);
    const steps = ko.segments.flatMap((segment) => segment.steps);
    expect(steps.some((step) => step.kind === 'portrait_stance' && step.stance === 'idle')).toBe(false);

    const living = buildCombatVisualFeedback([damageEvent(8)]);
    const livingSteps = living.segments.flatMap((segment) => segment.steps);
    expect(livingSteps.some((step) => step.kind === 'portrait_stance' && step.stance === 'idle')).toBe(true);
  });
});
