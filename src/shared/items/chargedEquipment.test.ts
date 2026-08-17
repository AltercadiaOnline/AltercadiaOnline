import { describe, expect, it } from 'vitest';
import { formatItemChargesLabel } from './chargedEquipment.js';

describe('formatItemChargesLabel', () => {
  it('monta Cargas: atual / máximo', () => {
    expect(formatItemChargesLabel(7, 10)).toBe('Cargas: 7 / 10');
    expect(formatItemChargesLabel(0, 10)).toBe('Cargas: 0 / 10');
    expect(formatItemChargesLabel(12, 10)).toBe('Cargas: 10 / 10');
  });
});
