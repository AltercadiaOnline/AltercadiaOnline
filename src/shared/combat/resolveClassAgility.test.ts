import { describe, expect, it } from 'vitest';
import { CLASS_CATALOG } from '../types/classes.js';
import { resolveClassAgility } from './resolveClassAgility.js';
import {
  buildInitiativeSpeedLines,
  formatInitiativeSpeedDisplay,
} from './initiativeSpeedDisplay.js';

describe('resolveClassAgility', () => {
  it('lê agilidade do CLASS_CATALOG (ordem competitiva)', () => {
    expect(resolveClassAgility('DISSOLUTUS')).toBe(CLASS_CATALOG.DISSOLUTUS.bonus.agility);
    expect(resolveClassAgility('IMPETUS')).toBe(CLASS_CATALOG.IMPETUS.bonus.agility);
    expect(resolveClassAgility('COGITOR')).toBe(CLASS_CATALOG.COGITOR.bonus.agility);
    expect(resolveClassAgility('TUTATOR')).toBe(CLASS_CATALOG.TUTATOR.bonus.agility);

    const order = (['DISSOLUTUS', 'IMPETUS', 'COGITOR', 'TUTATOR'] as const).map(
      (id) => resolveClassAgility(id),
    );
    expect(order).toEqual([8, 5, 3, 2]);
  });

  it('retorna 0 para classe ausente', () => {
    expect(resolveClassAgility(null)).toBe(0);
    expect(resolveClassAgility(undefined)).toBe(0);
    expect(resolveClassAgility('UNKNOWN')).toBe(0);
  });
});

describe('initiativeSpeedDisplay + classAgility', () => {
  it('usa classAgility na linha de classe e rótulo Agilidade', () => {
    const lines = buildInitiativeSpeedLines({
      profile: {
        flowSpeedBase: 10,
        classAgility: 8,
        equipSpeedFlat: 0,
        marcoSpeedFlat: 0,
        buffSpeedFlat: 0,
      },
    });
    const classe = lines.find((l) => l.source === 'classe');
    expect(classe?.flat).toBe(8);

    const display = formatInitiativeSpeedDisplay({
      profile: {
        flowSpeedBase: 10,
        classAgility: 8,
      },
      effectiveSpeedRaw: 18,
      speedAttributeContribution: 6,
    });
    expect(display.initiativeLine).toContain('Agilidade');
    expect(display.sumEquation).toContain('Classe');
  });

  it('aceita classSpeedBias legado como fallback de wire', () => {
    const lines = buildInitiativeSpeedLines({
      profile: {
        flowSpeedBase: 1,
        classSpeedBias: 5,
      },
    });
    expect(lines.find((l) => l.source === 'classe')?.flat).toBe(5);
  });
});
