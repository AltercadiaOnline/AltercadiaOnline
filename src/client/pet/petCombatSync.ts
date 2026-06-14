import { CombatEventType, type CombatEvent } from '../../shared/events.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';

/** Sincroniza estado do pet no mundo aberto a partir de eventos de combate autoritativos. */
export function syncPetStoreFromCombatEvents(events: readonly CombatEvent[]): void {
  for (const event of events) {
    if (event.type !== CombatEventType.PET_STATUS_CHANGED) continue;
    if (event.payload.status !== 'INACTIVE') continue;
    getPlayerPetStore().applyBattleDefeat();
  }
}
