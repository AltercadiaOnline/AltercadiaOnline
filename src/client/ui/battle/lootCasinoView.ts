import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';
import { allLootRevealSlotsEmpty } from '../../../shared/loot/lootRevealSlots.js';
import type { LootCasinoPhase } from './LootCasinoController.js';

export function resolveLootCasinoHintForPhase(
  phase: LootCasinoPhase,
  slots: readonly LootRevealSlot[],
  spin?: { readonly index: number; readonly count: number },
): string {
  const giroPrefix = spin && spin.count > 1
    ? `Giro ${spin.index + 1}/${spin.count}. `
    : '';

  switch (phase) {
    case 'idle':
      return `${giroPrefix}Puxe a alavanca para revelar as recompensas.`;
    case 'lever_pull':
      return `${giroPrefix}Alavanca acionada…`;
    case 'spinning':
      return `${giroPrefix}Aguarde — os slots estão girando…`;
    case 'ready':
      if (spin && spin.index + 1 < spin.count) {
        return `${giroPrefix}Giro revelado. Puxe de novo para o próximo.`;
      }
      return allLootRevealSlotsEmpty(slots)
        ? 'Nenhum drop desta vez. Toque em Coletar para encerrar (sair sem coletar também encerra).'
        : 'Toque em Coletar para o inventário — sair sem coletar perde estes itens.';
  }
}

export function resolveLootCasinoTitle(readyToCollect: boolean): string {
  return readyToCollect ? 'Recompensas prontas' : 'Recompensas';
}

export function resolveLootCasinoCollectLabel(pending: boolean): string {
  return pending ? 'Coletando…' : 'Coletar para o inventário';
}

export function resolveLootCasinoDiscardPrompt(slotsEmpty: boolean): {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
} {
  if (slotsEmpty) {
    return {
      title: 'Sair sem coletar?',
      body: 'Não há itens nesta rodada. Sair encerra o pacote de recompensas.',
      confirmLabel: 'Sair',
    };
  }
  return {
    title: 'Descartar loot?',
    body: 'Itens e VOLTS desta luta serão perdidos. Confirme só se quiser abrir mão das recompensas.',
    confirmLabel: 'Descartar loot',
  };
}
