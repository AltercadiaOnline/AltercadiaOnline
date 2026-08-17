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
        ? 'Nenhum drop desta vez. Colete ou saia — sair sem coletar perde o loot.'
        : 'Toque em Coletar para enviar ao inventário, ou saia sem coletar.';
  }
}
