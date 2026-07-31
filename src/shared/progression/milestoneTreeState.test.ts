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
  it('permite pré-selecionar qualquer starter quando não há trilha travada (Nv.10+)', () => {
    const ctx = baseCtx();
    expect(canSelectBranchStarter('quickStep', ctx)).toBe(true);
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(true);
    expect(canSelectBranchStarter('keenEye', ctx)).toBe(true);
  });

  it('permite escolha inicial mesmo com ramificação órfã (sem trilha travada)', () => {
    const ctx = baseCtx({ ramificacaoSelecionada: 'fluxo', trilhaTravada: false });
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(true);
  });

  it('bloqueia nova trilha se já houver starter ativo sem confirmação formal', () => {
    const ctx = baseCtx({ activeMarcos: ['quickStep'] });
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(false);
    expect(canSelectBranchStarter('quickStep', ctx)).toBe(false);
  });

  it('bloqueia CHOOSE_MARCO no starter até a trilha estar travada', () => {
    const ctx = baseCtx();
    expect(canChooseMarco('quickStep', ctx)).toBe(false);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
    expect(canChooseMarco('keenEye', ctx)).toBe(false);
  });

  it('após trilha travada com starter ativo, não libera de novo o 1º nível', () => {
    const ctx = baseCtx({
      activeMarcos: ['quickStep'],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      playerLevel: 14,
    });
    expect(canChooseMarco('quickStep', ctx)).toBe(false);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(false);
  });

  it('após trilha travada sem starter (legado), libera obter o 1º nível', () => {
    const ctx = baseCtx({
      activeMarcos: [],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      playerLevel: 14,
    });
    expect(canChooseMarco('quickStep', ctx)).toBe(true);
  });

  it('bloqueia avanço na árvore até confirmar uma trilha', () => {
    const ctx = baseCtx({ activeMarcos: ['quickStep'] });
    expect(canChooseMarco('fluxRush', ctx)).toBe(false);
  });

  it('no Nv.30 com starter ativo libera o 2º nó da trilha', () => {
    const ctx = baseCtx({
      activeMarcos: ['quickStep'],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      playerLevel: 30,
    });
    expect(canChooseMarco('fluxRush', ctx)).toBe(true);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
  });

  it('abaixo do Nv.30 ainda bloqueia o 2º nó', () => {
    const ctx = baseCtx({
      activeMarcos: ['quickStep'],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      playerLevel: 29,
    });
    expect(canChooseMarco('fluxRush', ctx)).toBe(false);
  });

  it('após trilha confirmada e starter ativo, só libera nós da mesma ramificação', () => {
    const ctx = baseCtx({
      activeMarcos: ['quickStep'],
      ramificacaoSelecionada: 'fluxo',
      trilhaTravada: true,
      playerLevel: 20,
    });
    expect(canChooseMarco('quickStep', ctx)).toBe(false);
    expect(canChooseMarco('ironStance', ctx)).toBe(false);
    expect(canSelectBranchStarter('ironStance', ctx)).toBe(false);
  });

  it('sanitize reinsere o starter se a trilha estiver travada sem 1º nível (legado)', () => {
    expect(sanitizeActiveMarcosForTrail([], 'fluxo', true)).toEqual(['quickStep']);
    expect(
      sanitizeActiveMarcosForTrail(['fluxRush'], 'fluxo', true),
    ).toEqual(['quickStep', 'fluxRush']);
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
