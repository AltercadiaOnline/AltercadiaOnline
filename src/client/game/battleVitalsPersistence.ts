import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { resolveDefeatRespawnHpCurrent } from '../../shared/character/playerVitals.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { didPlayerWinBattle, resolveCombatantHp } from '../../shared/items/combatCreatureRegistry.js';
import { getLastDispatch } from '../combat/index.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

import { getActionDispatcher } from '../ActionDispatcher.js';

export type PersistBattleEndVitalsOptions = {
  /** Motivo do fim — fuga mantém HP de combate e posição de farm. */
  readonly endReason?: BattleEndReason;
};

/** Captura HP final do combatente jogador e persiste no estado global + HUD. */
export function persistBattleEndVitals(
  options?: PersistBattleEndVitalsOptions,
): PlayerWorldVitals | null {
  if (getActionDispatcher().getMode() === 'online') {
    return null;
  }
  const dispatch = getLastDispatch();
  if (!dispatch) return null;

  const player = dispatch.state.combatants[dispatch.ui.playerActorId];
  if (!player) return null;

  const hpMax = Math.max(
    1,
    Math.floor(player.hpMax ?? player.maxHp ?? getPlayerEquipmentStore().getSnapshot().vitals.hpMax),
  );
  const playerWon = didPlayerWinBattle(dispatch.state, dispatch.ui.playerActorId);
  const fled = options?.endReason === 'FORFEIT';
  // Vitória / fuga → HP atual da luta. Derrota → ~10% no respawn da cidade.
  const hpCurrent = playerWon || fled
    ? Math.min(Math.max(0, Math.floor(resolveCombatantHp(player))), hpMax)
    : resolveDefeatRespawnHpCurrent(hpMax);
  const equipmentVitals = getPlayerEquipmentStore().getSnapshot().vitals;
  const vitals: PlayerWorldVitals = {
    ...equipmentVitals,
    hpCurrent: Math.min(hpCurrent, hpMax),
    hpMax,
  };

  getGlobalPlayerStore().applyWorldVitals(vitals);
  return vitals;
}
