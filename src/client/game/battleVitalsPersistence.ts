import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { resolveCombatantHp } from '../../shared/items/combatCreatureRegistry.js';
import { getLastDispatch } from '../hud/index.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

import { getActionDispatcher } from '../ActionDispatcher.js';

/** Captura HP final do combatente jogador e persiste no estado global + HUD. */
export function persistBattleEndVitals(): PlayerWorldVitals | null {
  if (getActionDispatcher().getMode() === 'online') {
    return null;
  }
  const dispatch = getLastDispatch();
  if (!dispatch) return null;

  const player = dispatch.state.combatants[dispatch.ui.playerActorId];
  if (!player) return null;

  const hpCurrent = Math.max(0, Math.floor(resolveCombatantHp(player)));
  const hpMax = Math.max(
    1,
    Math.floor(player.hpMax ?? player.maxHp ?? getPlayerEquipmentStore().getSnapshot().vitals.hpMax),
  );
  const equipmentVitals = getPlayerEquipmentStore().getSnapshot().vitals;
  const vitals: PlayerWorldVitals = {
    ...equipmentVitals,
    hpCurrent: Math.min(hpCurrent, hpMax),
    hpMax,
  };

  getGlobalPlayerStore().applyWorldVitals(vitals);
  return vitals;
}
