/**
 * Formato persistido de progressão do jogador (player_progression_data).
 */
import type { MarcoRamificacaoId } from './milestoneTreeCatalog.js';

export type { MarcoRamificacaoId };

export type PlayerProgressionData = {
  readonly movesetMastery: Readonly<Record<string, number>>;
  readonly milestoneTotalProgress: number;
  /** Trilha escolhida — fluxo | resiliencia | precisao. */
  readonly ramificacaoSelecionada: MarcoRamificacaoId | null;
  /** Após confirmação inicial — bloqueia troca/cancelamento na HUD. */
  readonly trilhaTravada: boolean;
};

export function createDefaultPlayerProgressionData(
  overrides: Partial<PlayerProgressionData> = {},
): PlayerProgressionData {
  return {
    movesetMastery: {},
    milestoneTotalProgress: 0,
    ramificacaoSelecionada: null,
    trilhaTravada: false,
    ...overrides,
  };
}
