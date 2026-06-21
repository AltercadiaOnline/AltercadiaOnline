import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';
import { allLootRevealSlotsEmpty } from '../../../shared/loot/lootRevealSlots.js';
import type { LootCasinoPhase } from './LootCasinoController.js';

export function resolveLootCasinoHintForPhase(
  phase: LootCasinoPhase,
  slots: readonly LootRevealSlot[],
): string {
  switch (phase) {
    case 'idle':
      return 'Puxe a alavanca para revelar as recompensas.';
    case 'lever_pull':
      return 'Alavanca acionada…';
    case 'spinning':
      return 'Aguarde — os slots estão girando…';
    case 'ready':
      return allLootRevealSlotsEmpty(slots)
        ? 'Nenhum drop desta vez. Colete ou saia — sair sem coletar perde o loot.'
        : 'Toque em Coletar para enviar ao inventário, ou saia sem coletar.';
  }
}
