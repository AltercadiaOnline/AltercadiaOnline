import { describe, expect, it } from 'vitest';
import { emptyMarcosNodeProgression } from './marcoProgression.js';
import {
  canChooseMarco,
  canSelectBranchStarter,
  sanitizeActiveMarcosForTrail,
  type MarcoTreePlayerContext,
} from './milestoneTreeState.js';

function baseCtx(overrides: Partial<MarcoTreePlayerContext> = {}): MarcoTreePlayerContext {
  return {
    activeMarcos: [],
    flowSpeedBase: 1,
    milestoneTotalProgress: 0,
    playerLevel: 10,
    ramificacaoSelecionada: null,
    trilhaTravada: false,
    nodeProgression: emptyMarcosNodeProgression(),
    ...overrides,
  };
}

describe('marcos trail selection', () => {
  it('permite escolher qualquer starter quando não há trilha travada (Nv.10+)', () => {
    const ctx = baseCtx();
    expect(canSelectBranchStarter('quickStep', ctx)).toBe(true);
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(true);
    expect(canSelectBranchStarter('keenEye', ctx)).toBe(true);
  });

  it('bloqueia CHOOSE_MARCO em starters — só SELECT_MARCO_BRANCH ativa a trilha', () => {
    const ctx = baseCtx();
    expect(canChooseMarco('quickStep', ctx)).toBe(false);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
    expect(canChooseMarco('keenEye', ctx)).toBe(false);
  });

  it('bloqueia avanço na árvore até confirmar uma trilha', () => {
    const ctx = baseCtx({ activeMarcos: ['quickStep'] });
    expect(canChooseMarco('fluxRush', ctx)).toBe(false);
  });

  it('após trilha confirmada, só libera nós da mesma ramificação', () => {
    const ctx = baseCtx({
      activeMarcos: ['quickStep'],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      flowSpeedBase: 50,
      playerLevel: 20,
    });
    expect(canChooseMarco('quickStep', ctx)).toBe(false);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(false);
  });

  it('sanitize remove todos os ativos sem trilha travada', () => {
    expect(
      sanitizeActiveMarcosForTrail(
        ['quickStep', 'ironStance', 'keenEye'],
        null,
        false,
      ),
    ).toEqual([]);
  });

  it('sanitize mantém só a trilha confirmada', () => {
    expect(
      sanitizeActiveMarcosForTrail(
        ['quickStep', 'ironStance', 'fluxRush'],
        'fluxo',
        true,
      ),
    ).toEqual(['quickStep', 'fluxRush']);
  });
});
