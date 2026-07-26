import { describe, expect, it } from 'vitest';
import {
  buildCombatHitResultLine,
  formatCombatHitMitigationSteps,
  pickCombatHitMitigation,
} from './combatHitMitigation.js';

describe('combatHitMitigation', () => {
  it('pickCombatHitMitigation omits empty snapshot', () => {
    expect(pickCombatHitMitigation({})).toBeUndefined();
  });

  it('formatCombatHitMitigationSteps lists post-formula modifiers', () => {
    const steps = formatCombatHitMitigationSteps(30, {
      isCritical: true,
      shieldAbsorbed: 8,
      incomingReductionPercent: 15,
    });
    expect(steps).toEqual(['Crítico', 'Escudo −8', 'Redução −15%']);
  });

  it('buildCombatHitResultLine reconciles net with modifiers', () => {
    const line = buildCombatHitResultLine(45, 12, 20, {
      isCritical: true,
      shieldAbsorbed: 5,
      incomingReductionPercent: 10,
    });
    expect(line).toBe(
      'Golpe 45 − Defesa 12 = 33 → Crítico → Escudo −5 → Redução −10% → Dano recebido = 20',
    );
  });
});
