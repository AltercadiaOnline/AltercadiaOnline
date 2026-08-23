/**
 * Gate de vida para duelo casual — HP no mapa (worldVitals) deve ser > 0.
 */

import { getWorldProfile } from '../world/worldProfileStore.js';

/** false = derrotado / sem vida no mapa — não pode convidar, aceitar ou bootstrap. */
export function canPlayerEnterCasualDuel(playerId: string, characterId: number): boolean {
  const vitals = getWorldProfile(playerId, characterId).sessionSync?.worldVitals;
  if (!vitals) return true;
  return vitals.hpCurrent > 0;
}

export function casualDuelHpBlockedReason(who: 'self' | 'target'): string {
  return who === 'self'
    ? 'Você precisa de vida para duelar. Cure-se antes.'
    : 'Oponente está fora de combate (sem vida).';
}
